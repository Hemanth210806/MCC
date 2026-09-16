# Kaggle Civic Issue Training Datasets — Provenance & Source Record

All training data for Mysuru Civic Connect (MCC) is sourced from real, publicly accessible civic and infrastructure datasets via the Kaggle API. No synthetic, AI-generated, or placeholder images are used.

## 1. Garbage / Waste Classification
- **Dataset Name:** Garbage Classification
- **Kaggle Owner:** asdasdasasdas
- **Kaggle Slug / Dataset ID:** `asdasdasasdas/garbage-classification`
- **Source URL:** https://www.kaggle.com/datasets/asdasdasasdas/garbage-classification
- **License:** Open Database License (ODbL) / CC0 Public Domain
- **Original Sub-classes:** `cardboard`, `glass`, `metal`, `paper`, `plastic`, `trash`
- **MCC Category Mapping:** All sub-classes mapped to `garbage` (Civic Solid Waste & Trash)
- **Preprocessing:** Resized to 224x224, RGB normalized, corrupted/unreadable images discarded.

## 2. Pothole / Road Damage Classification
- **Dataset Name:** Pothole Detection Dataset
- **Kaggle Owner:** atulyakumar98
- **Kaggle Slug / Dataset ID:** `atulyakumar98/pothole-detection-dataset`
- **Source URL:** https://www.kaggle.com/datasets/atulyakumar98/pothole-detection-dataset
- **License:** CC BY-SA 4.0
- **Original Sub-classes:** `potholes`
- **MCC Category Mapping:** `potholes` mapped to `pothole` (Road Damage / Potholes)
- **Preprocessing:** Resized to 224x224, RGB normalized, deduplicated via SHA-256 file hashing.

## 3. Streetlight / Public Lighting Failure
- **Dataset Name:** Light Poles Detection
- **Kaggle Owner:** samuelayman
- **Kaggle Slug / Dataset ID:** `samuelayman/light-poles`
- **Source URL:** https://www.kaggle.com/datasets/samuelayman/light-poles
- **License:** Open Data Commons / CC0
- **Original Sub-classes:** `final light poles`
- **MCC Category Mapping:** `final light poles` mapped to `streetlight` (Streetlight / Electrical Pole Infrastructure)
- **Preprocessing:** Resized to 224x224, RGB normalized, converted to JPEG format.

## 4. Water Leakage / Pipeline Infrastructure
- **Dataset Name:** Water Pipes Dataset
- **Kaggle Owner:** tareqalhmiedat
- **Kaggle Slug / Dataset ID:** `tareqalhmiedat/water-pipes-dataset`
- **Source URL:** https://www.kaggle.com/datasets/tareqalhmiedat/water-pipes-dataset
- **License:** CC BY 4.0
- **Original Sub-classes:** `train/images`, `valid/images` (Municipal water pipe joints, leakage, valve inspection)
- **MCC Category Mapping:** Mapped to `water_leakage` (Water Pipe Leakage & Infrastructure)
- **Preprocessing:** Resized to 224x224, RGB normalized.
