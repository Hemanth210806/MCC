import os
import shutil
import hashlib
import random
import json
from PIL import Image

def get_file_hash(filepath: str) -> str:
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        buf = f.read(65536)
        while len(buf) > 0:
            hasher.update(buf)
            buf = f.read(65536)
    return hasher.hexdigest()

def is_valid_image(filepath: str) -> bool:
    try:
        with Image.open(filepath) as img:
            img.verify()
        # Ensure we can read and convert to RGB
        with Image.open(filepath) as img:
            img.convert('RGB')
        return True
    except Exception:
        return False

def collect_images_from_dir(dir_path: str, max_count: int = 400) -> list:
    valid_images = []
    seen_hashes = set()

    for root, _, files in os.walk(dir_path):
        for file in files:
            ext = file.lower().rsplit('.', 1)[-1]
            if ext in ('jpg', 'jpeg', 'png', 'webp'):
                fpath = os.path.join(root, file)
                if is_valid_image(fpath):
                    h = get_file_hash(fpath)
                    if h not in seen_hashes:
                        seen_hashes.add(h)
                        valid_images.append(fpath)
                        if len(valid_images) >= max_count:
                            return valid_images
    return valid_images

def main():
    ml_dir = os.path.abspath(os.path.dirname(__file__))
    raw_dir = os.path.join(ml_dir, 'raw_datasets')
    dataset_dir = os.path.join(ml_dir, 'dataset')

    categories = ['garbage', 'pothole', 'streetlight', 'water_leakage']
    splits = ['train', 'val', 'test']

    # Clean existing destination dirs
    for s in splits:
        for c in categories:
            os.makedirs(os.path.join(dataset_dir, s, c), exist_ok=True)

    print("=== Preparing MCC 4-Category Civic Dataset ===")

    stats = {c: {'train': 0, 'val': 0, 'test': 0, 'total': 0} for c in categories}

    for cat in categories:
        # Search for raw folders containing category files
        cat_images = []
        for root, dirs, files in os.walk(raw_dir):
            r_lower = root.lower()
            if cat == 'garbage' and any(k in r_lower for k in ['garbage', 'waste', 'trash', 'cardboard', 'plastic']):
                cat_images.extend(collect_images_from_dir(root, max_count=150))
            elif cat == 'pothole' and any(k in r_lower for k in ['pothole', 'road']):
                cat_images.extend(collect_images_from_dir(root, max_count=150))
            elif cat == 'streetlight' and any(k in r_lower for k in ['light', 'pole', 'lamp', 'street']):
                cat_images.extend(collect_images_from_dir(root, max_count=150))
            elif cat == 'water_leakage' and any(k in r_lower for k in ['pipe', 'water', 'leak']):
                cat_images.extend(collect_images_from_dir(root, max_count=150))

        # Deduplicate and shuffle
        unique_paths = list(set(cat_images))
        random.seed(42)
        random.shuffle(unique_paths)

        # Cap per class to keep balanced
        selected = unique_paths[:200]
        total = len(selected)
        print(f"Collected {total} real images for class: {cat}")

        if total == 0:
            print(f"[WARNING] No images found for {cat} in raw_datasets! Please run download_datasets.py first.")
            continue

        n_train = int(total * 0.70)
        n_val = int(total * 0.15)
        train_set = selected[:n_train]
        val_set = selected[n_train:n_train + n_val]
        test_set = selected[n_train + n_val:]

        for s_name, s_imgs in [('train', train_set), ('val', val_set), ('test', test_set)]:
            dest_folder = os.path.join(dataset_dir, s_name, cat)
            for idx, img_path in enumerate(s_imgs):
                dest_file = os.path.join(dest_folder, f"{cat}_{idx:04d}.jpg")
                try:
                    with Image.open(img_path) as im:
                        rgb_im = im.convert('RGB').resize((224, 224))
                        rgb_im.save(dest_file, "JPEG", quality=90)
                except Exception as e:
                    pass
            stats[cat][s_name] = len(s_imgs)

        stats[cat]['total'] = total

    report_path = os.path.join(dataset_dir, 'dataset_stats.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2)

    print("\n=== Dataset Preparation Summary ===")
    print(json.dumps(stats, indent=2))
    print(f"Stats saved to {report_path}")

if __name__ == '__main__':
    main()
