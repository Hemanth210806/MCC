import os
import json
import numpy as np
import cv2
from typing import Tuple, Optional

# Lazy import tensorflow to speed up general server startup
_model = None
_class_indices = None

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DEFAULT_MODEL_PATH = os.path.join(PROJECT_ROOT, 'models', 'mcc_mobilenetv2.keras')
DEFAULT_CLASS_NAMES_PATH = os.path.join(PROJECT_ROOT, 'models', 'class_names.json')

CATEGORY_LABEL_MAP = {
    'waste': 'Garbage / Waste',
    'pothole': 'Pothole / Road Damage',
    'streetlight_damage': 'Streetlight Failure',
    'other': 'Other / Unrelated'
}

LEGACY_LABEL_ALIASES = {
    'garbage': 'waste',
    'trash': 'waste',
    'waste': 'waste',
    'streetlight': 'streetlight_damage',
    'streetlight_failure': 'streetlight_damage',
    'water_leakage': 'other',
    'water': 'other',
    'unknown': 'other',
    'other': 'other'
}


def normalize_label(raw_label: str) -> str:
    normalized = str(raw_label).strip().lower().replace(' ', '_').replace('-', '_')
    return LEGACY_LABEL_ALIASES.get(normalized, normalized)


def get_model(model_path: Optional[str] = None):
    global _model, _class_indices
    if _model is not None:
        return _model, _class_indices

    if not model_path:
        env_path = os.environ.get('ML_MODEL_PATH')
        candidates = [
            env_path,
            os.path.join(os.path.dirname(__file__), 'model', 'mcc_mobilenetv2.keras'),
            os.path.join(PROJECT_ROOT, 'models', 'mcc_mobilenetv2.keras'),
            os.path.join(PROJECT_ROOT, 'backend', 'ml', 'model', 'mcc_mobilenetv2.keras'),
            os.path.join(os.getcwd(), 'models', 'mcc_mobilenetv2.keras'),
            os.path.join(os.getcwd(), 'backend', 'ml', 'model', 'mcc_mobilenetv2.keras'),
            DEFAULT_MODEL_PATH,
        ]
        for cand in candidates:
            if cand and os.path.exists(cand):
                model_path = os.path.abspath(cand)
                break
        if not model_path:
            model_path = DEFAULT_MODEL_PATH

    if os.path.exists(model_path):
        try:
            import tensorflow as tf
            _model = tf.keras.models.load_model(model_path, compile=False)

            class_names_path = os.path.join(os.path.dirname(model_path), 'class_names.json')
            if not os.path.exists(class_names_path):
                class_names_path = DEFAULT_CLASS_NAMES_PATH
            if os.path.exists(class_names_path):
                with open(class_names_path, 'r', encoding='utf-8') as f:
                    class_names = json.load(f)
                _class_indices = {idx: normalize_label(label) for idx, label in enumerate(class_names)}
            else:
                _class_indices = {0: 'waste', 1: 'pothole', 2: 'streetlight_damage', 3: 'other'}
            print(f"[Inference] Loaded trained model from {model_path}")
        except Exception as e:
            print(f"[Inference] Warning: Failed to load model at {model_path}: {e}")
            _model = None
            _class_indices = {0: 'waste', 1: 'pothole', 2: 'streetlight_damage', 3: 'other'}
    else:
        print(f"[Inference] Model file not found at {model_path}. Fallback mode active.")
        _model = None
        _class_indices = {0: 'waste', 1: 'pothole', 2: 'streetlight_damage', 3: 'other'}

    return _model, _class_indices


def predict(image_path: str) -> Tuple[str, float]:
    """
    Given an image path, load image via OpenCV, preprocess,
    and predict class and confidence.
    Returns: (standard_category_name, confidence_float)
    """
    model, class_indices = get_model()

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at {image_path}")

    img_bgr = cv2.imread(image_path)
    if img_bgr is not None:
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(img_rgb, (224, 224), interpolation=cv2.INTER_AREA)
    else:
        # Fallback to PIL (supports AVIF, non-standard WebP, TIFF, etc.)
        try:
            from PIL import Image
            pil_img = Image.open(image_path).convert("RGB")
            resized = np.array(pil_img.resize((224, 224), Image.Resampling.BILINEAR))
        except Exception as e:
            raise ValueError(f"Could not read image file at {image_path}: {e}")

    input_arr = np.expand_dims(resized.astype('float32') / 255.0, axis=0)

    if model is not None:
        predictions = model.predict(input_arr, verbose=0)[0]
        top_idx = int(np.argmax(predictions))
        confidence = float(predictions[top_idx])
        raw_label = class_indices.get(top_idx, 'other')
        normalized_label = normalize_label(raw_label)
        standard_name = CATEGORY_LABEL_MAP.get(normalized_label, normalized_label)
        return standard_name, confidence

    return "Garbage / Waste", 0.75
