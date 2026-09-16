import os

if 'KAGGLE_API_TOKEN' not in os.environ and os.path.exists(os.path.expanduser('~/.kaggle/access_token')):
    with open(os.path.expanduser('~/.kaggle/access_token'), 'r') as f:
        os.environ['KAGGLE_API_TOKEN'] = f.read().strip()

from kaggle.api.kaggle_api_extended import KaggleApi

api = KaggleApi()
api.authenticate()

candidates = [
    "asdasdasasdas/garbage-classification",
    "atulyakumar98/pothole-detection-dataset",
    "praznaparamitha/street-lamp-fault",
    "tareqalhmiedat/water-pipes-dataset",
    "andrewpal/water-pipe-leak"
]

for c in candidates:
    print(f"\n--- Files in: {c} ---")
    try:
        files = api.dataset_list_files(c).files
        print(f"Total files: {len(files)}")
        for f in files[:8]:
            print(f"  {f.name} ({f.size} bytes)")
    except Exception as e:
        print(f"Error checking {c}: {e}")
