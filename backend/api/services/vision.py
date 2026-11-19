
import ast
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image
import cv2

BASE_DIR = Path(__file__).resolve().parents[3]

MODEL_PATH = (
    BASE_DIR
    / "ai"
    / "furniture-detection"
    / "models"
    / "furniture_v2_best.onnx"
)

IMAGE_SIZE = 416
CONF_THRESHOLD = 0.25
IOU_THRESHOLD = 0.70

if not MODEL_PATH.is_file():
    raise RuntimeError(f"Furniture model missing: {MODEL_PATH}")

# Limit CPU threads to reduce resource usage.
options = ort.SessionOptions()
options.intra_op_num_threads = 2
options.inter_op_num_threads = 1

session = ort.InferenceSession(
    str(MODEL_PATH),
    sess_options=options,
    providers=["CPUExecutionProvider"],
)

input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

# Read the original furniture class names from ONNX metadata.
metadata = session.get_modelmeta().custom_metadata_map
CLASS_NAMES = ast.literal_eval(metadata["names"])



def preprocess_image(image: Image.Image):
    # Convert to RGB, preserving the expected ONNX channel order.
    image = image.convert("RGB")
    original = np.asarray(image)

    height, width = original.shape[:2]

    # Ultralytics letterbox resize ratio.
    scale = min(
        IMAGE_SIZE / height,
        IMAGE_SIZE / width,
    )

    new_width = round(width * scale)
    new_height = round(height * scale)

    # Match OpenCV interpolation used by Ultralytics.
    resized = cv2.resize(
        original,
        (new_width, new_height),
        interpolation=cv2.INTER_LINEAR,
    )

    # Square letterbox padding (equivalent to rect=False).
    dw = IMAGE_SIZE - new_width
    dh = IMAGE_SIZE - new_height

    dw /= 2
    dh /= 2

    top = round(dh - 0.1)
    bottom = round(dh + 0.1)
    left = round(dw - 0.1)
    right = round(dw + 0.1)

    padded = cv2.copyMakeBorder(
        resized,
        top,
        bottom,
        left,
        right,
        cv2.BORDER_CONSTANT,
        value=(114, 114, 114),
    )

    # Convert RGB HWC to RGB NCHW.
    tensor = padded.transpose(2, 0, 1)

    tensor = np.ascontiguousarray(
        tensor[None].astype(np.float32) / 255.0
    )

    return (
        tensor,
        scale,
        left,
        top,
        width,
        height,
    )



def calculate_iou(box, boxes):
    if len(boxes) == 0:
        return np.empty(0, dtype=np.float32)

    x1 = np.maximum(box[0], boxes[:, 0])
    y1 = np.maximum(box[1], boxes[:, 1])
    x2 = np.minimum(box[2], boxes[:, 2])
    y2 = np.minimum(box[3], boxes[:, 3])

    intersection = (
        np.maximum(0, x2 - x1)
        * np.maximum(0, y2 - y1)
    )

    area_box = max(0, box[2] - box[0]) * max(
        0, box[3] - box[1]
    )

    area_boxes = (
        np.maximum(0, boxes[:, 2] - boxes[:, 0])
        * np.maximum(0, boxes[:, 3] - boxes[:, 1])
    )

    union = area_box + area_boxes - intersection

    return intersection / np.maximum(union, 1e-7)


def non_max_suppression(boxes, scores, class_ids):
    # Class-aware NMS: overlapping objects from different
    # furniture classes do not suppress each other.
    keep = []

    for class_id in np.unique(class_ids):
        indices = np.where(class_ids == class_id)[0]
        indices = indices[np.argsort(scores[indices])[::-1]]

        while len(indices) > 0:
            best = indices[0]
            keep.append(best)

            if len(indices) == 1:
                break

            remaining = indices[1:]
            ious = calculate_iou(boxes[best], boxes[remaining])
            indices = remaining[ious <= IOU_THRESHOLD]

    return sorted(keep, key=lambda i: scores[i], reverse=True)


def analyze_image(image: Image.Image):
    tensor, scale, pad_x, pad_y, width, height = (
        preprocess_image(image)
    )

    outputs = session.run(
        [output_name],
        {input_name: tensor},
    )

    # Model output: (1, 10, 3549)
    # Convert to: (3549, 10)
    predictions = outputs[0][0].T

    # First four values: center x, center y, width, height.
    boxes_xywh = predictions[:, :4]

    # Remaining six values: furniture class scores.
    class_scores = predictions[:, 4:]

    class_ids = np.argmax(class_scores, axis=1)
    confidences = np.max(class_scores, axis=1)

    valid = confidences >= CONF_THRESHOLD

    boxes_xywh = boxes_xywh[valid]
    class_ids = class_ids[valid]
    confidences = confidences[valid]

    detections = []
    counts = {}

    if len(boxes_xywh) > 0:
        # Convert xywh to xyxy.
        boxes = np.empty_like(boxes_xywh)

        boxes[:, 0] = (
            boxes_xywh[:, 0] - boxes_xywh[:, 2] / 2
        )
        boxes[:, 1] = (
            boxes_xywh[:, 1] - boxes_xywh[:, 3] / 2
        )
        boxes[:, 2] = (
            boxes_xywh[:, 0] + boxes_xywh[:, 2] / 2
        )
        boxes[:, 3] = (
            boxes_xywh[:, 1] + boxes_xywh[:, 3] / 2
        )

        keep = non_max_suppression(
            boxes,
            confidences,
            class_ids,
        )

        for i in keep:
            box = boxes[i].copy()

            # Remove letterbox padding and restore coordinates.
            box[[0, 2]] = (box[[0, 2]] - pad_x) / scale
            box[[1, 3]] = (box[[1, 3]] - pad_y) / scale

            box[[0, 2]] = np.clip(box[[0, 2]], 0, width)
            box[[1, 3]] = np.clip(box[[1, 3]], 0, height)

            class_id = int(class_ids[i])
            object_name = CLASS_NAMES[class_id]
            confidence = float(confidences[i])

            counts[object_name] = counts.get(object_name, 0) + 1

            detections.append({
                "object_name": object_name,
                "confidence": round(confidence, 3),
                "box": {
                    "x1": round(float(box[0])),
                    "y1": round(float(box[1])),
                    "x2": round(float(box[2])),
                    "y2": round(float(box[3])),
                },
            })

    return {
        "detections": detections,
        "counts": counts,
        "image_size": {
            "width": width,
            "height": height,
        },
    }
