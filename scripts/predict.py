#!/usr/bin/env python3
import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT_DIR / "models" / "mcc_mobilenetv2.keras"
CLASS_NAMES_PATH = ROOT_DIR / "models" / "class_names.json"
CONFIDENCE_THRESHOLD = 0.70


def load_model_and_classes():
    model = tf.keras.models.load_model(str(MODEL_PATH))
    class_names = json.loads(CLASS_NAMES_PATH.read_text(encoding="utf-8"))
    return model, class_names


def preprocess_image(path: str):
    image = Image.open(path).convert("RGB")
    image = image.resize((224, 224))
    array = np.asarray(image, dtype=np.float32) / 255.0
    array = np.expand_dims(array, axis=0)
    return array


def classify_image(image_path: str):
    model, class_names = load_model_and_classes()
    processed = preprocess_image(image_path)
    probs = model.predict(processed, verbose=0)[0]
    pred_index = int(np.argmax(probs))
    pred_label = class_names[pred_index]
    confidence = float(probs[pred_index])

    print("Prediction")
    print("----------")
    for name, value in zip(class_names, probs):
        print(f"{name}: {value:.4f}")
    print(f"Predicted class: {pred_label}")
    print(f"Confidence: {confidence:.4f}")

    if pred_label == "other":
        status = "INVALID / UNRELATED"
    elif confidence < CONFIDENCE_THRESHOLD:
        status = "UNCERTAIN"
        print("Message: Please upload a clearer image.")
    else:
        status = "VALID CIVIC ISSUE"

    print(f"Status: {status}")
    return pred_label, confidence, status


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python scripts/predict.py path/to/image.jpg")
        sys.exit(1)
    image_path = sys.argv[1]
    classify_image(image_path)
