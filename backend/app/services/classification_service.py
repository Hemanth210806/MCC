import os
from typing import Dict, Any
from flask import current_app
from ml.inference import predict

MODEL_VERSION = "MobileNetV2-TransferLearning-v1.0"

class ClassificationService:
    @staticmethod
    def classify_image(image_path: str) -> Dict[str, Any]:
        """
        Classifies an uploaded complaint image.
        Returns:
            {
                "category_name": str,
                "confidence": float,
                "low_confidence": bool,
                "status": "CLASSIFIED" | "LOW_CONFIDENCE" | "REVIEW_REQUIRED",
                "model_version": str
            }
        """
        threshold = 0.60
        try:
            if current_app:
                threshold = current_app.config.get('ML_CONFIDENCE_THRESHOLD', 0.60)
        except RuntimeError:
            pass

        try:
            predicted_cat, conf = predict(image_path)
            is_unrelated = predicted_cat == 'Other / Unrelated'
            low_conf = (conf < threshold) or is_unrelated
            status = 'REVIEW_REQUIRED' if is_unrelated else ('LOW_CONFIDENCE' if low_conf else 'CLASSIFIED')

            return {
                'category_name': predicted_cat,
                'confidence': conf,
                'low_confidence': low_conf,
                'status': status,
                'model_version': MODEL_VERSION
            }
        except Exception as e:
            print(f"[ClassificationService] Classification failure/exception: {e}")
            # Do NOT invent a category and do NOT crash complaint submission.
            return {
                'category_name': None,
                'confidence': 0.0,
                'low_confidence': True,
                'status': 'REVIEW_REQUIRED',
                'model_version': MODEL_VERSION
            }

classification_service = ClassificationService()
