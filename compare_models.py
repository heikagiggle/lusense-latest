
from pathlib import Path

from PIL import Image
from ultralytics import YOLO

from backend.api.services.vision import analyze_image

MODEL_PATH = Path(
    "ai/furniture-detection/models/furniture_v2_best.pt"
)

IMAGE_FOLDER = Path(
    "ai/furniture-detection/test-images"
)

pytorch_model = YOLO(str(MODEL_PATH))

# Compare every image in the test-images folder.
image_paths = sorted(
    path
    for path in IMAGE_FOLDER.iterdir()
    if path.suffix.lower() in {
        ".jpg", ".jpeg", ".png", ".webp"
    }
)

if not image_paths:
    raise RuntimeError("No test images found.")

for image_path in image_paths:
    print("\n" + "=" * 60)
    print(f"IMAGE: {image_path.name}")
    print("=" * 60)

    # Original PyTorch model
    pytorch_results = pytorch_model.predict(
        source=str(image_path),
        imgsz=416,
        device="cpu",
        conf=0.25,
        iou=0.70,
        verbose=False,
    )

    print("\nPYTORCH DETECTIONS:")

    pytorch_count = 0

    for result in pytorch_results:
        for box in result.boxes:
            class_id = int(box.cls[0])

            print(
                pytorch_model.names[class_id],
                "-",
                round(float(box.conf[0]), 3),
            )

            pytorch_count += 1

    if pytorch_count == 0:
        print("No furniture detected")

    # ONNX model
    with Image.open(image_path) as image:
        onnx_results = analyze_image(image)

    print("\nONNX DETECTIONS:")

    if not onnx_results["detections"]:
        print("No furniture detected")

    for detection in onnx_results["detections"]:
        print(
            detection["object_name"],
            "-",
            detection["confidence"],
        )

from pathlib import Path

from PIL import Image
from ultralytics import YOLO

from backend.api.services.vision import analyze_image

MODEL_PATH = Path(
    "ai/furniture-detection/models/furniture_v2_best.pt"
)

IMAGE_FOLDER = Path(
    "ai/furniture-detection/test-images"
)

pytorch_model = YOLO(str(MODEL_PATH))

# Compare every image in the test-images folder.
image_paths = sorted(
    path
    for path in IMAGE_FOLDER.iterdir()
    if path.suffix.lower() in {
        ".jpg", ".jpeg", ".png", ".webp"
    }
)

if not image_paths:
    raise RuntimeError("No test images found.")

for image_path in image_paths:
    print("\n" + "=" * 60)
    print(f"IMAGE: {image_path.name}")
    print("=" * 60)

    # Original PyTorch model
    pytorch_results = pytorch_model.predict(
        source=str(image_path),
        imgsz=416,
        device="cpu",
        conf=0.25,
        iou=0.70,
        verbose=False,
    )

    print("\nPYTORCH DETECTIONS:")

    pytorch_count = 0

    for result in pytorch_results:
        for box in result.boxes:
            class_id = int(box.cls[0])

            print(
                pytorch_model.names[class_id],
                "-",
                round(float(box.conf[0]), 3),
            )

            pytorch_count += 1

    if pytorch_count == 0:
        print("No furniture detected")

    # ONNX model
    with Image.open(image_path) as image:
        onnx_results = analyze_image(image)

    print("\nONNX DETECTIONS:")

    if not onnx_results["detections"]:
        print("No furniture detected")

    for detection in onnx_results["detections"]:
        print(
            detection["object_name"],
            "-",
            detection["confidence"],
        )
