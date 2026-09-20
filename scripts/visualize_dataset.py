#!/usr/bin/env python3
import os
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parents[1]
DATASET_ROOT = ROOT_DIR / "data" / "mcc_dataset"
OUTPUT_DIR = ROOT_DIR / "reports" / "dataset_samples"
CLASS_NAMES = ["waste", "pothole", "streetlight_damage", "other"]
SAMPLE_COUNT = 10


def sample_images_for_class(class_name: str):
    class_dir = DATASET_ROOT / "train" / class_name
    if not class_dir.exists():
        return []
    paths = sorted(p for p in class_dir.iterdir() if p.is_file())[:SAMPLE_COUNT]
    return paths


def save_grid(class_name: str, images):
    output_dir = OUTPUT_DIR / class_name
    output_dir.mkdir(parents=True, exist_ok=True)
    fig, axes = plt.subplots(1, min(len(images), SAMPLE_COUNT), figsize=(16, 4))
    if len(images) == 1:
        axes = [axes]
    for ax, image_path in zip(axes, images):
        ax.imshow(Image.open(image_path))
        ax.axis("off")
        ax.set_title(image_path.name, fontsize=8)
    fig.tight_layout()
    save_path = output_dir / f"{class_name}_samples.png"
    fig.savefig(save_path, dpi=200)
    plt.close(fig)
    return save_path


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for class_name in CLASS_NAMES:
        images = sample_images_for_class(class_name)
        if not images:
            print(f"[WARN] No training images found for {class_name}")
            continue
        save_path = save_grid(class_name, images)
        print(f"Saved {len(images)} samples for {class_name} to {save_path}")


if __name__ == "__main__":
    main()
