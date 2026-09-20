#!/usr/bin/env python3
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix

ROOT_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT_DIR / "models" / "mcc_mobilenetv2.keras"
CLASS_NAMES_PATH = ROOT_DIR / "models" / "class_names.json"
TEST_DIR = ROOT_DIR / "data" / "mcc_dataset" / "test"
REPORTS_DIR = ROOT_DIR / "reports"


def load_test_dataset():
    ds = tf.keras.utils.image_dataset_from_directory(
        str(TEST_DIR),
        labels="inferred",
        label_mode="categorical",
        class_names=json.loads(CLASS_NAMES_PATH.read_text(encoding="utf-8")),
        image_size=(224, 224),
        batch_size=16,
        shuffle=False,
    )
    ds = ds.map(lambda x, y: (tf.keras.applications.mobilenet_v2.preprocess_input(x), y), num_parallel_calls=tf.data.AUTOTUNE)
    return ds.prefetch(tf.data.AUTOTUNE)


def main():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}. Run scripts/train.py first.")

    model = tf.keras.models.load_model(str(MODEL_PATH))
    class_names = json.loads(CLASS_NAMES_PATH.read_text(encoding="utf-8"))
    test_ds = load_test_dataset()

    y_true = []
    y_pred = []
    for images, labels in test_ds:
        logits = model.predict(images, verbose=0)
        y_true.extend(np.argmax(labels.numpy(), axis=1).tolist())
        y_pred.extend(np.argmax(logits, axis=1).tolist())

    report = classification_report(y_true, y_pred, target_names=class_names, digits=4, output_dict=True)
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (REPORTS_DIR / "classification_report.txt").write_text(classification_report(y_true, y_pred, target_names=class_names, digits=4), encoding="utf-8")

    fig, ax = plt.subplots(figsize=(8, 6))
    import seaborn as sns
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=class_names, yticklabels=class_names, ax=ax)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True")
    ax.set_title("Confusion Matrix")
    fig.tight_layout()
    fig.savefig(REPORTS_DIR / "confusion_matrix.png", dpi=200)
    plt.close(fig)

    metrics = {
        "test_images": len(y_true),
        "accuracy": float(report["accuracy"]),
        "macro_precision": float(report["macro avg"]["precision"]),
        "macro_recall": float(report["macro avg"]["recall"]),
        "macro_f1": float(report["macro avg"]["f1-score"]),
        "per_class": {label: report[label] for label in class_names},
        "confusion_matrix": cm.tolist(),
    }
    (REPORTS_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print(f"Test accuracy: {metrics['accuracy']:.4f}")
    print(f"Macro precision: {metrics['macro_precision']:.4f}")
    print(f"Macro recall: {metrics['macro_recall']:.4f}")
    print(f"Macro F1: {metrics['macro_f1']:.4f}")
    print(f"Confusion matrix saved to: {REPORTS_DIR / 'confusion_matrix.png'}")


if __name__ == "__main__":
    main()
