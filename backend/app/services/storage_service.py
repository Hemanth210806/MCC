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

        # Persist binary data to database so uploads survive Render container restarts/reloads
        try:
            with open(full_path, 'rb') as f:
                data = f.read()
            if data:
                from app.models.stored_file import StoredFile
                import mimetypes
                content_type = mimetypes.guess_type(unique_name)[0] or 'image/jpeg'
                StoredFile.save_bytes(rel_path, data, content_type)
        except Exception:
            # Safe non-blocking fallback if database session is outside request context
            pass

        return rel_path

    def persist_file(self, relative_path: str, full_path: str = None) -> bool:
        """
        Manually sync an existing file on disk into the persistent database.
        """
        try:
            abs_path = full_path or self.get_absolute_path(relative_path)
            if os.path.exists(abs_path) and os.path.isfile(abs_path):
                with open(abs_path, 'rb') as f:
                    data = f.read()
                if data:
                    from app.models.stored_file import StoredFile
                    import mimetypes
                    content_type = mimetypes.guess_type(abs_path)[0] or 'image/jpeg'
                    StoredFile.save_bytes(relative_path, data, content_type)
                    return True
        except Exception:
            pass
        return False

    def get_absolute_path(self, relative_path: str) -> str:
        clean_rel = relative_path.replace('/static/uploads/', '').lstrip('/')
        return os.path.join(self.upload_folder, clean_rel)

storage_service = StorageService()
