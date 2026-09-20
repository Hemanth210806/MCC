#!/usr/bin/env python3
import json
import shutil
from pathlib import Path

import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.models import Model

ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = Path(r"C:\Users\lenovo\Downloads\testing")
DATASET_DIR = ROOT / "data" / "demo_training"
MODELS_DIR = ROOT / "models"
CLASS_NAMES = ["waste", "pothole", "streetlight_damage"]
FOLDER_MAP = {
    "waste": "waste",
    "pathhole": "pothole",
    "streetlight": "streetlight_damage",
}

np.random.seed(42)
tf.random.set_seed(42)


def prepare_dataset():
    if DATASET_DIR.exists():
        shutil.rmtree(DATASET_DIR)

    for label in CLASS_NAMES:
        (DATASET_DIR / label).mkdir(parents=True, exist_ok=True)

    for source_folder, target_label in FOLDER_MAP.items():
        source_dir = SRC_ROOT / source_folder
        if not source_dir.exists():
            raise FileNotFoundError(f"Folder not found: {source_dir}")

        for src in sorted(p for p in source_dir.iterdir() if p.is_file()):
            shutil.copy2(src, DATASET_DIR / target_label / src.name)

    print("Prepared exact demo dataset:")
    for label in CLASS_NAMES:
        count = len(list((DATASET_DIR / label).iterdir()))
        print(f"  {label}: {count}")


def build_model():
    base_model = MobileNetV2(weights="imagenet", include_top=False, input_shape=(224, 224, 3))
    base_model.trainable = False
    x = base_model.output
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(128, activation="relu")(x)
    outputs = layers.Dense(len(CLASS_NAMES), activation="softmax")(x)
    model = Model(inputs=base_model.input, outputs=outputs)
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3), loss="categorical_crossentropy", metrics=["accuracy"])
    return model


def evaluate_same_images(model):
    ds = tf.keras.utils.image_dataset_from_directory(
        str(DATASET_DIR),
        labels="inferred",
        label_mode="categorical",
        class_names=CLASS_NAMES,
        image_size=(224, 224),
        batch_size=1,
        shuffle=False,
    )
    ds = ds.map(lambda x, y: (tf.keras.applications.mobilenet_v2.preprocess_input(x), y), num_parallel_calls=tf.data.AUTOTUNE)

    preds = model.predict(ds, verbose=0)
    pred_labels = np.argmax(preds, axis=1)
    true_labels = []
    for _, y in ds:
        true_labels.extend(np.argmax(y.numpy(), axis=1).tolist())

    correct = sum(int(pred == true) for pred, true in zip(pred_labels, true_labels))
    total = len(true_labels)
    print(f"Exact demo-set accuracy: {correct}/{total} ({correct / total:.2%})")
    for idx, (pred, true) in enumerate(zip(pred_labels, true_labels), start=1):
        print(f"  {idx}: pred={CLASS_NAMES[pred]} true={CLASS_NAMES[true]}")


def main():
    if not SRC_ROOT.exists():
        raise FileNotFoundError(f"Source folder not found: {SRC_ROOT}")

    prepare_dataset()
    train_ds = tf.keras.utils.image_dataset_from_directory(
        str(DATASET_DIR),
        labels="inferred",
        label_mode="categorical",
        class_names=CLASS_NAMES,
        image_size=(224, 224),
        batch_size=2,
        shuffle=True,
    )
    train_ds = train_ds.map(lambda x, y: (tf.keras.applications.mobilenet_v2.preprocess_input(x), y), num_parallel_calls=tf.data.AUTOTUNE).prefetch(tf.data.AUTOTUNE)

    model = build_model()
    history = model.fit(train_ds, epochs=30, verbose=1)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODELS_DIR / "mcc_mobilenetv2.keras"
    demo_model_path = MODELS_DIR / "demo_mcc_mobilenetv2.keras"
    model.save(model_path)
    model.save(demo_model_path)

    for cname_path in [MODELS_DIR / "class_names.json", MODELS_DIR / "demo_class_names.json"]:
        with cname_path.open("w", encoding="utf-8") as f:
            json.dump(CLASS_NAMES, f, indent=2)

    print("\nDemo training complete")
    print(f"Saved primary model: {model_path}")
    print(f"Saved demo model: {demo_model_path}")
    print(f"Saved class labels: {MODELS_DIR / 'class_names.json'}")
    print(f"Final training accuracy: {history.history['accuracy'][-1]:.4f}")
    evaluate_same_images(model)


if __name__ == "__main__":
    main()
