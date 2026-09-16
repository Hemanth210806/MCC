import os
import json
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
from tensorflow.keras.preprocessing.image import ImageDataGenerator

def main():
    ml_dir = os.path.abspath(os.path.dirname(__file__))
    model_dir = os.path.join(ml_dir, 'model')
    dataset_dir = os.path.join(ml_dir, 'dataset')
    test_dir = os.path.join(dataset_dir, 'test')
    model_path = os.path.join(model_dir, 'mcc_classifier.h5')

    if not os.path.exists(model_path):
        print(f"[ERROR] Trained model not found at {model_path}! Run train_model.py first.")
        return

    print("Loading model and test dataset...")
    model = tf.keras.models.load_model(model_path)

    test_datagen = ImageDataGenerator(rescale=1./255)
    test_generator = test_datagen.flow_from_directory(
        test_dir,
        target_size=(224, 224),
        batch_size=16,
        class_mode='categorical',
        shuffle=False
    )

    class_labels = list(test_generator.class_indices.keys())
    y_true = test_generator.classes

    predictions = model.predict(test_generator, verbose=1)
    y_pred = np.argmax(predictions, axis=1)

    acc = float(accuracy_score(y_true, y_pred))
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)
    cm = confusion_matrix(y_true, y_pred).tolist()
    cr = classification_report(y_true, y_pred, target_names=class_labels, output_dict=True, zero_division=0)

    metrics = {
        'model_architecture': 'MobileNetV2 Transfer Learning',
        'accuracy': round(acc, 4),
        'weighted_precision': round(float(precision), 4),
        'weighted_recall': round(float(recall), 4),
        'weighted_f1_score': round(float(f1), 4),
        'confusion_matrix': cm,
        'classes': class_labels,
        'classification_report': cr
    }

    metrics_path = os.path.join(model_dir, 'metrics.json')
    with open(metrics_path, 'w', encoding='utf-8') as f:
        json.dump(metrics, f, indent=2)

    print("\n=== Model Evaluation Results ===")
    print(f"Accuracy: {acc * 100:.2f}%")
    print(f"Weighted F1-Score: {f1:.4f}")
    print(f"Confusion Matrix: {cm}")
    print(f"Metrics saved to {metrics_path}")

if __name__ == '__main__':
    main()
