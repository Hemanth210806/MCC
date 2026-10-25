import os
import hashlib
import json
import random
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / 'raw_datasets'
DATASET_DIR = ROOT / 'dataset'
PROCESSED_DIR = DATASET_DIR / 'processed'
CLASS_NAMES = ['Garbage_Waste', 'Pothole', 'Streetlight']
RAW_SOURCE_MAP = {
    'Garbage_Waste': [RAW_DIR / 'asdasdasasdas_garbage-classification'],
    'Pothole': [RAW_DIR / 'chitholian_annotated-potholes-dataset' / 'annotated-images'],
    'Streetlight': [RAW_DIR / 'samuelayman_light-poles' / 'final light poles'],
}


def get_file_hash(path: str) -> str:
    digest = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            digest.update(chunk)
    return digest.hexdigest()


def is_valid_image(path: str) -> bool:
    try:
        with Image.open(path) as img:
            img.verify()
        with Image.open(path) as img:
            img.convert('RGB')
        return True
    except Exception:
        return False


def collect_images(folder: Path, max_count: int = 2000):
    valid = []
    seen = set()
    for root, _, files in os.walk(folder):
        for file in files:
            if not file.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                continue
            path = Path(root) / file
            if not is_valid_image(str(path)):
                continue
            digest = get_file_hash(str(path))
            if digest in seen:
                continue
            seen.add(digest)
            valid.append(str(path))
            if len(valid) >= max_count:
                return valid
    return valid


def save_split(split_name: str, label: str, files):
    dest_dir = PROCESSED_DIR / split_name / label
    dest_dir.mkdir(parents=True, exist_ok=True)
    for index, src_path in enumerate(files):
        dst = dest_dir / f'{label}_{index:04d}.jpg'
        with Image.open(src_path) as img:
            rgb = img.convert('RGB').resize((224, 224))
            rgb.save(dst, 'JPEG', quality=90)


def main():
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    for split_name in ['train', 'test']:
        for label in CLASS_NAMES:
            (PROCESSED_DIR / split_name / label).mkdir(parents=True, exist_ok=True)

    stats = {label: {'train': 0, 'test': 0, 'total': 0} for label in CLASS_NAMES}
    random.seed(42)

    for label in CLASS_NAMES:
        selected = []
        for folder in RAW_SOURCE_MAP.get(label, []):
            if folder.exists():
                selected.extend(collect_images(folder, max_count=2000))
        selected = list(dict.fromkeys(selected))
        if not selected:
            print(f'No images found for {label}; skipping.')
            continue

        random.shuffle(selected)
        total = len(selected)
        train_end = max(1, int(total * 0.7))
        train_files = selected[:train_end]
        test_files = selected[train_end:]

        save_split('train', label, train_files)
        save_split('test', label, test_files)

        stats[label]['train'] = len(train_files)
        stats[label]['test'] = len(test_files)
        stats[label]['total'] = total

    report_path = DATASET_DIR / 'dataset_stats.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2)

    print('Prepared 3-class dataset:')
    print(json.dumps(stats, indent=2))
    print(f'Dataset stats saved to {report_path}')


if __name__ == '__main__':
    main()
