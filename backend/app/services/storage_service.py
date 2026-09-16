import os
import uuid
from werkzeug.utils import secure_filename
from app.utils.validators import allowed_file

class StorageService:
    def __init__(self, upload_folder: str = None):
        if not upload_folder:
            backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
            upload_folder = os.path.join(backend_dir, 'app', 'static', 'uploads')
        self.upload_folder = upload_folder
        os.makedirs(self.upload_folder, exist_ok=True)

    def save_file(self, file_storage, subfolder: str = "") -> str:
        """
        Saves a FileStorage object and returns the relative accessible path.
        """
        if not file_storage or file_storage.filename == '':
            raise ValueError("No file provided")

        if not allowed_file(file_storage.filename):
            raise ValueError("File type not permitted")

        filename = secure_filename(file_storage.filename)
        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'jpg'
        unique_name = f"{uuid.uuid4().hex}_{filename}"

        target_dir = os.path.join(self.upload_folder, subfolder) if subfolder else self.upload_folder
        os.makedirs(target_dir, exist_ok=True)

        full_path = os.path.join(target_dir, unique_name)
        file_storage.save(full_path)

        # Return web accessible path
        rel_path = f"/static/uploads/{subfolder + '/' if subfolder else ''}{unique_name}"
        return rel_path

    def get_absolute_path(self, relative_path: str) -> str:
        clean_rel = relative_path.replace('/static/uploads/', '').lstrip('/')
        return os.path.join(self.upload_folder, clean_rel)

storage_service = StorageService()
