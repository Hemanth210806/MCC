import os
import sys
import zipfile
from dotenv import load_dotenv

# Load .env
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(backend_dir, '.env'))

def setup_kaggle_credentials():
    # Modern Kaggle token or legacy username/key
    token = os.environ.get('KAGGLE_API_TOKEN')
    username = os.environ.get('KAGGLE_USERNAME')
    key = os.environ.get('KAGGLE_KEY')

    # Also check ~/.kaggle/access_token
    home_token_path = os.path.expanduser('~/.kaggle/access_token')
    if not token and os.path.exists(home_token_path):
        with open(home_token_path, 'r') as f:
            token = f.read().strip()
            os.environ['KAGGLE_API_TOKEN'] = token

    if token:
        os.environ['KAGGLE_API_TOKEN'] = token
        # Ensure ~/.kaggle/access_token is populated
        os.makedirs(os.path.expanduser('~/.kaggle'), exist_ok=True)
        if not os.path.exists(home_token_path):
            with open(home_token_path, 'w') as f:
                f.write(token)
    elif username and key:
        os.environ['KAGGLE_USERNAME'] = username
        os.environ['KAGGLE_KEY'] = key
    else:
        print("[ERROR] Kaggle credentials missing! Please supply KAGGLE_API_TOKEN or KAGGLE_USERNAME + KAGGLE_KEY in .env")
        sys.exit(1)

    try:
        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi()
        api.authenticate()
        return api
    except Exception as e:
        print(f"[ERROR] Kaggle API authentication failed: {e}")
        sys.exit(1)

def download_and_extract(api, dataset_slug: str, dest_dir: str):
    slug_clean = dataset_slug.replace('/', '_')
    target_folder = os.path.join(dest_dir, slug_clean)
    os.makedirs(target_folder, exist_ok=True)

    print(f"Downloading dataset '{dataset_slug}' into {target_folder}...")
    try:
        api.dataset_download_files(dataset_slug, path=target_folder, unzip=True, quiet=False)
        print(f"Successfully downloaded and extracted: {dataset_slug}")
    except Exception as e:
        print(f"Warning/Error downloading {dataset_slug}: {e}")

def main():
    api = setup_kaggle_credentials()
    raw_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'raw_datasets'))
    os.makedirs(raw_dir, exist_ok=True)

    datasets = {
        'garbage': os.environ.get('KAGGLE_GARBAGE_DATASET', 'asdasdasasdas/garbage-classification'),
        'pothole': os.environ.get('KAGGLE_POTHOLE_DATASET', 'atulyakumar98/pothole-detection-dataset'),
        'streetlight': os.environ.get('KAGGLE_STREETLIGHT_DATASET', 'samuelayman/light-poles'),
        'water_leakage': os.environ.get('KAGGLE_WATER_LEAKAGE_DATASET', 'tareqalhmiedat/water-pipes-dataset')
    }

    print("=== Kaggle Real Dataset Acquisition ===")
    for category, slug in datasets.items():
        if not slug:
            print(f"[WARNING] No dataset slug configured for category '{category}'!")
            continue
        print(f"\n--- Processing Category: {category} (Kaggle Dataset: {slug}) ---")
        download_and_extract(api, slug, raw_dir)

    print("\nDataset acquisition completed!")

if __name__ == '__main__':
    main()
