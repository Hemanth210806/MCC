#!/usr/bin/env python3
import json
import os
import random
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from tensorflow.keras.layers import Dense, Dropout, GlobalAveragePooling2D
from tensorflow.keras.models import Model

ROOT_DIR = Path(__file__).resolve().parents[1]
DATASET_ROOT = ROOT_DIR / "data" / "mcc_dataset"
MODELS_DIR = ROOT_DIR / "models"
REPORTS_DIR = ROOT_DIR / "reports"
CLASS_NAMES = ["waste", "pothole", "streetlight_damage", "other"]
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 16

random.seed(42)
np.random.seed(42)
tf.random.set_seed(42)


def build_model():
    base_model = MobileNetV2(weights="imagenet", include_top=False, input_shape=(224, 224, 3))
    base_model.trainable = False

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.3)(x)
    x = Dense(128, activation="relu")(x)
    outputs = Dense(len(CLASS_NAMES), activation="softmax")(x)

    model = Model(inputs=base_model.input, outputs=outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def make_dataset(directory: str, shuffle: bool = True):
    ds = tf.keras.utils.image_dataset_from_directory(
        directory,
        labels="inferred",
        label_mode="categorical",
        class_names=CLASS_NAMES,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        shuffle=shuffle,
        validation_split=None,
    )
    return ds.prefetch(tf.data.AUTOTUNE)


def to_serializable_history(history_dict):
    serializable = {}
    for key, values in history_dict.items():
        if isinstance(values, (list, tuple)):
            serializable[key] = [float(v) for v in values]
        else:
            serializable[key] = float(values)
    return serializable


def save_history_plot(history):
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    axes[0].plot(history.history["accuracy"], label="train_acc")
    axes[0].plot(history.history["val_accuracy"], label="val_acc")
    axes[0].set_title("Accuracy")
    axes[0].legend()

    axes[1].plot(history.history["loss"], label="train_loss")
    axes[1].plot(history.history["val_loss"], label="val_loss")
    axes[1].set_title("Loss")
    axes[1].legend()
    fig.tight_layout()
    fig.savefig(REPORTS_DIR / "training_history.png", dpi=200)
    plt.close(fig)


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    train_dir = DATASET_ROOT / "train"
    val_dir = DATASET_ROOT / "validation"
    test_dir = DATASET_ROOT / "test"

    if not all(path.exists() for path in [train_dir, val_dir, test_dir]):
        raise FileNotFoundError("Dataset folders not found. Run scripts/prepare_dataset.py first.")

    train_ds = make_dataset(str(train_dir), shuffle=True)
    val_ds = make_dataset(str(val_dir), shuffle=False)
    test_ds = make_dataset(str(test_dir), shuffle=False)

    train_ds = train_ds.map(lambda x, y: (tf.keras.applications.mobilenet_v2.preprocess_input(x), y), num_parallel_calls=tf.data.AUTOTUNE)
    val_ds = val_ds.map(lambda x, y: (tf.keras.applications.mobilenet_v2.preprocess_input(x), y), num_parallel_calls=tf.data.AUTOTUNE)
    test_ds = test_ds.map(lambda x, y: (tf.keras.applications.mobilenet_v2.preprocess_input(x), y), num_parallel_calls=tf.data.AUTOTUNE)

    data_augmentation = tf.keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.08),
        layers.RandomZoom(0.05),
        layers.RandomTranslation(0.08, 0.08),
    ])

    train_ds = train_ds.map(lambda x, y: (data_augmentation(x, training=True), y), num_parallel_calls=tf.data.AUTOTUNE)

    model = build_model()
    print(model.summary())

    callbacks = [
        EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
        ModelCheckpoint(filepath=str(MODELS_DIR / "mcc_mobilenetv2.keras"), monitor="val_loss", save_best_only=True),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-6),
    ]

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=15,
        callbacks=callbacks,
        verbose=1,
    )

    # Optional fine-tuning stage: unfreeze a small tail of MobileNetV2.
    base_model = model.layers[1]
    if hasattr(base_model, "layers"):
        base_model.trainable = True
        for layer in base_model.layers[:-30]:
            layer.trainable = False
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
            loss="categorical_crossentropy",
            metrics=["accuracy"],
        )

        history_ft = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=8,
            callbacks=[
                EarlyStopping(monitor="val_loss", patience=3, restore_best_weights=True),
                ModelCheckpoint(filepath=str(MODELS_DIR / "mcc_mobilenetv2.keras"), monitor="val_loss", save_best_only=True),
                ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2, min_lr=1e-6),
            ],
            verbose=1,
        )
        combined_history = {key: history.history.get(key, []) + history_ft.history.get(key, []) for key in sorted(set(history.history) | set(history_ft.history))}
        with (REPORTS_DIR / "training_history.json").open("w", encoding="utf-8") as handle:
            json.dump(to_serializable_history(combined_history), handle, indent=2)
    else:
        with (REPORTS_DIR / "training_history.json").open("w", encoding="utf-8") as handle:
            json.dump(to_serializable_history(history.history), handle, indent=2)

    save_history_plot(history)

    with (MODELS_DIR / "class_names.json").open("w", encoding="utf-8") as handle:
        json.dump(CLASS_NAMES, handle, indent=2)

    print("\nTraining complete.")
    print(f"Saved best model: {MODELS_DIR / 'mcc_mobilenetv2.keras'}")
    print(f"Saved class mapping: {MODELS_DIR / 'class_names.json'}")


if __name__ == "__main__":
    main()
