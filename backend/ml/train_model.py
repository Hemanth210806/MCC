import os
import json
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator

def build_model(num_classes: int = 4, input_shape=(224, 224, 3)):
    # Load MobileNetV2 with ImageNet weights
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=input_shape)
    base_model.trainable = False  # Freeze feature extractor

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.3)(x)
    x = Dense(128, activation='relu')(x)
    predictions = Dense(num_classes, activation='softmax', name='classifier_output')(x)

    model = Model(inputs=base_model.input, outputs=predictions)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    return model

def main():
    ml_dir = os.path.abspath(os.path.dirname(__file__))
    dataset_dir = os.path.join(ml_dir, 'dataset')
    model_dir = os.path.join(ml_dir, 'model')
    os.makedirs(model_dir, exist_ok=True)

    train_dir = os.path.join(dataset_dir, 'train')
    val_dir = os.path.join(dataset_dir, 'val')

    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        horizontal_flip=True,
        zoom_range=0.15
    )
    val_datagen = ImageDataGenerator(rescale=1./255)

    batch_size = 16
    train_generator = train_datagen.flow_from_directory(
        train_dir,
        target_size=(224, 224),
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=True
    )

    val_generator = val_datagen.flow_from_directory(
        val_dir,
        target_size=(224, 224),
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=False
    )

    class_indices = train_generator.class_indices
    print(f"Class indices: {class_indices}")
    with open(os.path.join(model_dir, 'class_indices.json'), 'w') as f:
        json.dump(class_indices, f, indent=2)

    model = build_model(num_classes=len(class_indices))
    print(model.summary())

    epochs = 5
    print(f"Starting training for {epochs} epochs...")
    history = model.fit(
        train_generator,
        validation_data=val_generator,
        epochs=epochs,
        verbose=1
    )

    model_path = os.path.join(model_dir, 'mcc_classifier.h5')
    model.save(model_path)
    print(f"\nTrained model successfully saved to: {model_path}")

    # Save training history
    hist_dict = {k: [float(v) for v in vals] for k, vals in history.history.items()}
    with open(os.path.join(model_dir, 'training_history.json'), 'w') as f:
        json.dump(hist_dict, f, indent=2)

if __name__ == '__main__':
    main()
