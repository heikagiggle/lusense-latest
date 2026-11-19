from pathlib import Path
from PIL import Image
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parents[3]

# MODEL_PATH = BASE_DIR / "runs" / "detect" / "models" / "furniture_yolov8_v2" / "weights" / "best.pt"

MODEL_PATH = (
    BASE_DIR
    / "ai"
    / "furniture-detection"
    / "models"
    / "furniture_v2_best.pt"
)
if not MODEL_PATH.is_file():
    raise RuntimeError(f"Furniture model missing: {MODEL_PATH}")

model = YOLO(MODEL_PATH)

# ANALYZE IMAGE

def analyze_image(image: Image.Image):

    # results = model(image)
    results = model.predict(
    source=image,
    imgsz=416,
    device="cpu",
    half=False,
    verbose=False,
)

    detections = []
    counts = {}

    for result in results:

        # Image dimensions
        image_height, image_width = result.orig_shape

        # Go through every detected object
        for box in result.boxes:

            # Class
            class_id = int(box.cls[0])

            object_name = model.names[class_id]

            # Confidence
            confidence = float(box.conf[0])

            # Bounding box
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            # Count objects
            counts[object_name] = (
                counts.get(object_name, 0) + 1
            )

            # Save detection
            detections.append({
                "object_name": object_name,
                "confidence": round(confidence, 3),
                "box": {
                    "x1": round(x1),
                    "y1": round(y1),
                    "x2": round(x2),
                    "y2": round(y2)
                }
            })

    return {
        "detections": detections,
        "counts": counts,
        "image_size": {
            "width": image_width,
            "height": image_height
        }
    }
