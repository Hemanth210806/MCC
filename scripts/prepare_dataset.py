#!/usr/bin/env python3
import hashlib
import json
import os
import random
import shutil
import sys
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image
from sklearn.model_selection import train_test_split

ROOT_DIR = Path(__file__).resolve().parents[1]
ENV_PATHS = [ROOT_DIR / ".env", ROOT_DIR.parent / ".env"]

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
CLASS_NAMES = ["waste", "pothole", "streetlight_damage", "other"]
TARGET_PER_CLASS = 120


def parse_project_env():
    for env_path in ENV_PATHS:
        if not env_path.exists():
            continue
        for raw_line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            line = line.replace("export ", "", 1)
            if "=" in line:
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and value:
                    os.environ.setdefault(key, value)
            elif not os.getenv("KAGGLE_API_TOKEN"):
                os.environ["KAGGLE_API_TOKEN"] = line.strip()


parse_project_env()
load_dotenv(ROOT_DIR / ".env", override=True)
load_dotenv(ROOT_DIR.parent / ".env", override=True)


def log(message: str):
    print(message)


def get_kaggle_api():
    token = os.getenv("KAGGLE_API_TOKEN")
    if token:
        os.environ["KAGGLE_API_TOKEN"] = token
        kaggle_dir = Path.home() / ".kaggle"
        kaggle_dir.mkdir(parents=True, exist_ok=True)
        token_path = kaggle_dir / "access_token"
        token_path.write_text(token, encoding="utf-8")
        os.chmod(token_path, 0o600)
        from kaggle.api.kaggle_api_extended import KaggleApi

        api = KaggleApi()
        api.authenticate()
        return api

    raise RuntimeError("Kaggle credentials are missing or unreadable in .env. Use KAGGLE_API_TOKEN from the provided project .env file.")


def download_datasets():
    raw_dir = ROOT_DIR / "data" / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    dataset_slugs = [
        "raj713335/smartathon",
        "owm4096/street-objects",
    ]

    if not any((raw_dir / slug.replace("/", "_")).exists() for slug in dataset_slugs):
        api = get_kaggle_api()
        for slug in dataset_slugs:
            target_dir = raw_dir / slug.replace("/", "_")
            target_dir.mkdir(parents=True, exist_ok=True)
            log(f"Downloading {slug} -> {target_dir}")
            try:
                api.dataset_download_files(slug, path=str(target_dir), unzip=True, quiet=True)
            except Exception as exc:
                log(f"[WARN] Failed to download {slug}: {exc}")
    return raw_dir


def find_image_files(base_dir: Path):
    if not base_dir.exists():
        return []
    return [p for p in base_dir.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS]


def is_valid_image(path: Path):
    try:
        with Image.open(path) as img:
            img.verify()
        return True
    except Exception:
        return False


def sha256_of(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def maybe_map_label(path: Path):
    lower_path = " ".join(part.lower() for part in path.parts)

    if "garbage" in lower_path or "waste" in lower_path or "trash" in lower_path:
        return "waste"
    if "pothole" in lower_path or "potholes" in lower_path or "road_damage" in lower_path or "road-damage" in lower_path:
        return "pothole"
    if (
        "bad_streetlight" in lower_path
        or "damaged_streetlight" in lower_path
        or "broken_streetlight" in lower_path
        or "streetlight_damage" in lower_path
        or "street_light" in lower_path
        or "street light" in lower_path
    ):
        return "streetlight_damage"
    if "person" in lower_path or "people" in lower_path or "car" in lower_path or "bicycle" in lower_path or "truck" in lower_path or "trafficlight" in lower_path:
        return "other"
    if "construction_road" in lower_path or "constr" in lower_path or "shelter" in lower_path or "signage" in lower_path or "clutter" in lower_path or "faded" in lower_path or "road" in lower_path or "street" in lower_path or "normal" in lower_path or "scene" in lower_path or "building" in lower_path or "unkept" in lower_path or "sand" in lower_path:
        return "other"
    if "streetlight" in lower_path and "trafficlight" not in lower_path:
        return "streetlight_damage"

    return None


def collect_candidates(raw_dir: Path):
    candidates = {label: [] for label in CLASS_NAMES}
    seen_hashes = set()
    image_files = find_image_files(raw_dir)
    log(f"Found {len(image_files)} candidate images in raw datasets.")

    for image_path in image_files:
        if not is_valid_image(image_path):
            log(f"[SKIP] unreadable image: {image_path}")
            continue

        label = maybe_map_label(image_path)
        if label is None:
            continue

        file_hash = sha256_of(image_path)
        if file_hash in seen_hashes:
            log(f"[SKIP] duplicate image hash: {image_path}")
            continue
        seen_hashes.add(file_hash)
        candidates[label].append(image_path)

    return candidates


def select_balanced_subset(files):
    files = sorted(files)
    if not files:
        return []
    if len(files) > TARGET_PER_CLASS:
        random.Random(42).shuffle(files)
        return files[:TARGET_PER_CLASS]
    return files


def build_dataset_structure(dataset_root: Path):
    for split in ["train", "validation", "test"]:
        for label in CLASS_NAMES:
            (dataset_root / split / label).mkdir(parents=True, exist_ok=True)


def split_class_files(files):
    files = sorted(files)
    if not files:
        return [], [], []
    if len(files) == 1:
        return files, [], []
    if len(files) == 2:
        return files[:1], files[1:], []
    if len(files) == 3:
        return files[:2], files[2:], []

    train_files, remaining = train_test_split(files, test_size=0.30, random_state=42, shuffle=True)
    if len(remaining) < 2:
        train_files, remaining = train_test_split(files, test_size=0.40, random_state=42, shuffle=True)
    if len(remaining) >= 2:
        val_files, test_files = train_test_split(remaining, test_size=0.5, random_state=42, shuffle=True)
        return train_files, val_files, test_files
    return train_files, remaining, []


def write_split_dataset(selected_by_class):
    dataset_root = ROOT_DIR / "data" / "mcc_dataset"
    if dataset_root.exists():
        shutil.rmtree(dataset_root)
    build_dataset_structure(dataset_root)

    for label in CLASS_NAMES:
        files = selected_by_class.get(label, [])
        if not files:
            log(f"[WARN] No usable files for class '{label}'.")
            continue

        train_files, val_files, test_files = split_class_files(files)

        for split_name, split_files in [("train", train_files), ("validation", val_files), ("test", test_files)]:
            target_dir = dataset_root / split_name / label
            for src in split_files:
                target = target_dir / src.name
                if target.exists():
                    target = target_dir / f"{src.stem}_{abs(hash(str(src)))}{src.suffix}"
                shutil.copy2(src, target)

    return dataset_root


def summarize_dataset(dataset_root: Path):
    summary = {}
    total = 0
    for label in CLASS_NAMES:
        counts = {}
        for split_name in ["train", "validation", "test"]:
            split_dir = dataset_root / split_name / label
            counts[split_name] = len(list(split_dir.iterdir())) if split_dir.exists() else 0
            total += counts[split_name]
        summary[label] = counts

    log("\nDataset Summary")
    log("---------------")
    for label in CLASS_NAMES:
        log(f"{label}: {summary[label]}")
    log(f"Total: {total}")
    return summary


def main():
    random.seed(42)
    raw_dir = download_datasets()
    candidates = collect_candidates(raw_dir)
    selected = {label: select_balanced_subset(candidates.get(label, [])) for label in CLASS_NAMES}

    for label in CLASS_NAMES:
        log(f"Class '{label}': discovered={len(candidates.get(label, []))}, selected={len(selected[label])}")

    if sum(len(v) for v in selected.values()) == 0:
        raise RuntimeError("No usable images were found in the downloaded datasets.")

    dataset_root = write_split_dataset(selected)
    summary = summarize_dataset(dataset_root)

    with (ROOT_DIR / "data" / "dataset_summary.json").open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)

    log(f"\nPrepared dataset saved to: {dataset_root}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        log(f"[FATAL] {exc}")
        sys.exit(1)
