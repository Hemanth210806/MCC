import os
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
from tensorflow.keras.layers import Dense, Dropout, GlobalAveragePooling2D
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator

CLASS_NAMES = ['Garbage_Waste', 'Pothole', 'Streetlight']
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 16


def build_model(num_classes: int = 3, input_shape=(224, 224, 3)):
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=input_shape)
    base_model.trainable = False

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.3)(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.3)(x)
    outputs = Dense(num_classes, activation='softmax')(x)

    model = Model(inputs=base_model.input, outputs=outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss='categorical_crossentropy',
        metrics=['accuracy'],
    )
    return model


def main():
    ml_dir = os.path.abspath(os.path.dirname(__file__))
    dataset_dir = os.path.join(ml_dir, 'dataset', 'processed')
    model_dir = os.path.join(ml_dir, 'model')
    os.makedirs(model_dir, exist_ok=True)

    train_dir = os.path.join(dataset_dir, 'train')
    test_dir = os.path.join(dataset_dir, 'test')

    if not os.path.exists(train_dir) or not os.path.exists(test_dir):
        raise FileNotFoundError('Processed dataset not found. Run backend/ml/prepare_dataset.py first.')

    train_datagen = ImageDataGenerator(
        preprocessing_function=tf.keras.applications.mobilenet_v2.preprocess_input,
        rotation_range=15,
        width_shift_range=0.08,
        height_shift_range=0.08,
        zoom_range=0.08,
        horizontal_flip=True,
        brightness_range=[0.85, 1.15],
    )
    test_datagen = ImageDataGenerator(
        preprocessing_function=tf.keras.applications.mobilenet_v2.preprocess_input,
    )

    train_generator = train_datagen.flow_from_directory(
        train_dir,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        classes=CLASS_NAMES,
        shuffle=True,
        seed=42,
    )
    test_generator = test_datagen.flow_from_directory(
        test_dir,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        classes=CLASS_NAMES,
        shuffle=False,
    )

    model = build_model(num_classes=len(CLASS_NAMES), input_shape=(224, 224, 3))
    print(model.summary())

    callbacks = [
        EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True),
        ModelCheckpoint(filepath=os.path.join(model_dir, 'civic_issue_mobilenetv2.keras'), monitor='val_loss', save_best_only=True),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, min_lr=1e-6),
    ]

    history = model.fit(
        train_generator,
        validation_data=test_generator,
        epochs=12,
        callbacks=callbacks,
        verbose=1,
    )

    base_model = model.layers[1]
    if hasattr(base_model, 'layers'):
        base_model.trainable = True
        for layer in base_model.layers[:-30]:
            layer.trainable = False
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
            loss='categorical_crossentropy',
            metrics=['accuracy'],
        )
        history_ft = model.fit(
            train_generator,
            validation_data=test_generator,
            epochs=8,
            callbacks=[
                EarlyStopping(monitor='val_loss', patience=4, restore_best_weights=True),
                ModelCheckpoint(filepath=os.path.join(model_dir, 'civic_issue_mobilenetv2.keras'), monitor='val_loss', save_best_only=True),
                ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, min_lr=1e-6),
            ],
            verbose=1,
        )
        combined = {k: history.history.get(k, []) + history_ft.history.get(k, []) for k in sorted(set(history.history) | set(history_ft.history))}
        training_history = {key: [float(v) for v in values] for key, values in combined.items()}
    else:
        training_history = {key: [float(v) for v in values] for key, values in history.history.items()}

    with open(os.path.join(model_dir, 'training_history.json'), 'w', encoding='utf-8') as f:
        json.dump(training_history, f, indent=2)

    with open(os.path.join(model_dir, 'class_names.json'), 'w', encoding='utf-8') as f:
        json.dump(CLASS_NAMES, f, indent=2)

    print(f"Saved model: {os.path.join(model_dir, 'civic_issue_mobilenetv2.keras')}")
    print(f"Saved class names: {os.path.join(model_dir, 'class_names.json')}")


if __name__ == '__main__':
    main()
