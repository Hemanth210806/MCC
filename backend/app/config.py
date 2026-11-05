import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env file from backend root or parent
basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
load_dotenv(os.path.join(basedir, '.env'))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'mcc_default_dev_secret_key_2026')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'mcc_jwt_secret_token_key_2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)

    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL:
        if DATABASE_URL.startswith('postgres://'):
            DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql+psycopg2://', 1)
        elif DATABASE_URL.startswith('postgresql://') and not DATABASE_URL.startswith('postgresql+'):
            DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg2://', 1)

    # Data directory (supports optional MCC_DATA_DIR persistent disk mount, falling back safely)
    _mcc_data_dir = os.environ.get('MCC_DATA_DIR')
    if _mcc_data_dir:
        try:
            os.makedirs(_mcc_data_dir, exist_ok=True)
            _default_db_dir = _mcc_data_dir
        except (PermissionError, OSError):
            _default_db_dir = os.path.join(basedir, 'instance')
            os.makedirs(_default_db_dir, exist_ok=True)
    else:
        _default_db_dir = os.path.join(basedir, 'instance')
        os.makedirs(_default_db_dir, exist_ok=True)

    if not DATABASE_URL:
        DATABASE_URL = f"sqlite:///{os.path.join(_default_db_dir, 'mcc.db')}"

    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_ENGINE_OPTIONS = {'connect_args': {'timeout': 30}} if DATABASE_URL.startswith('sqlite') else {}
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Uploads
    _upload_folder = os.environ.get('UPLOAD_FOLDER')
    if not _upload_folder:
        _upload_folder = os.path.join(_default_db_dir, 'uploads') if os.environ.get('MCC_DATA_DIR') else os.path.join(basedir, 'app/static/uploads')
    try:
        UPLOAD_FOLDER = _upload_folder if os.path.isabs(_upload_folder) else os.path.join(basedir, _upload_folder)
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    except (PermissionError, OSError):
        UPLOAD_FOLDER = os.path.join(basedir, 'app/static/uploads')
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_UPLOAD_MB', 5)) * 1024 * 1024
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

    # ML Config
    project_root = os.path.abspath(os.path.join(basedir, '..'))
    default_ml_model_path = os.environ.get('ML_MODEL_PATH', os.path.join(project_root, 'backend', 'ml', 'model', 'civic_issue_mobilenetv2.keras'))
    if not os.path.isabs(default_ml_model_path):
        default_ml_model_path = os.path.join(project_root, default_ml_model_path)
    ML_MODEL_PATH = default_ml_model_path
    ML_CONFIDENCE_THRESHOLD = float(os.environ.get('ML_CONFIDENCE_THRESHOLD', 0.60))

    # GIS / Analytics
    HOTSPOT_EPS_METERS = float(os.environ.get('HOTSPOT_EPS_METERS', 200))
    HOTSPOT_MIN_SAMPLES = int(os.environ.get('HOTSPOT_MIN_SAMPLES', 5))
    RECURRING_RADIUS_METERS = float(os.environ.get('RECURRING_RADIUS_METERS', 50))
    RECURRING_WINDOW_DAYS = int(os.environ.get('RECURRING_WINDOW_DAYS', 90))

    # SLA
    SLA_HIGH_HOURS = int(os.environ.get('SLA_HIGH_HOURS', 24))
    SLA_MEDIUM_HOURS = int(os.environ.get('SLA_MEDIUM_HOURS', 72))
    SLA_LOW_HOURS = int(os.environ.get('SLA_LOW_HOURS', 168))

    # Kaggle
    KAGGLE_USERNAME = os.environ.get('KAGGLE_USERNAME', '')
    KAGGLE_KEY = os.environ.get('KAGGLE_KEY', '')
    KAGGLE_API_TOKEN = os.environ.get('KAGGLE_API_TOKEN', '')
    KAGGLE_GARBAGE_DATASET = os.environ.get('KAGGLE_GARBAGE_DATASET', 'asdasdasasdas/garbage-classification')
    KAGGLE_POTHOLE_DATASET = os.environ.get('KAGGLE_POTHOLE_DATASET', 'atulyakumar98/pothole-detection-dataset')
    KAGGLE_STREETLIGHT_DATASET = os.environ.get('KAGGLE_STREETLIGHT_DATASET', 'samuelayman/light-poles')
    KAGGLE_WATER_LEAKAGE_DATASET = os.environ.get('KAGGLE_WATER_LEAKAGE_DATASET', 'tareqalhmiedat/water-pipes-dataset')

class DevelopmentConfig(Config):
    DEBUG = True

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

class ProductionConfig(Config):
    DEBUG = False

config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig
}
