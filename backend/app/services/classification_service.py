import os
from typing import Dict, Any
from flask import current_app
from ml.inference import predict

MODEL_VERSION = "MobileNetV2-TransferLearning-v3-civic-issue"
ALLOWED_CATEGORIES = {'Garbage_Waste', 'Pothole', 'Streetlight'}

class ClassificationService:
    @staticmethod
    def classify_image(image_path: str) -> Dict[str, Any]:
        threshold = 0.60
        try:
            if current_app:
                threshold = current_app.config.get('ML_CONFIDENCE_THRESHOLD', 0.60)
        except RuntimeError:
            pass

        try:
            predicted_cat, conf = predict(image_path)
            if predicted_cat not in ALLOWED_CATEGORIES:
                predicted_cat = None
            low_conf = conf < threshold or predicted_cat is None
            status = 'REVIEW_REQUIRED' if predicted_cat is None else ('LOW_CONFIDENCE' if low_conf else 'CLASSIFIED')
            return {
                'category_name': predicted_cat,
                'confidence': round(float(conf), 4),
                'low_confidence': low_conf,
                'status': status,
                'model_version': MODEL_VERSION
            }
        except Exception as e:
            print(f"[ClassificationService] Classification failure/exception: {e}")
            return {
                'category_name': None,
                'confidence': 0.0,
                'low_confidence': True,
                'status': 'REVIEW_REQUIRED',
                'model_version': MODEL_VERSION
            }

classification_service = ClassificationService()
