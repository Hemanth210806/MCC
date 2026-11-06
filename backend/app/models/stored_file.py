from datetime import datetime
from app.extensions import db

class StoredFile(db.Model):
    __tablename__ = 'stored_files'

    id = db.Column(db.Integer, primary_key=True)
    file_path = db.Column(db.String(500), unique=True, nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False, index=True)
    content_type = db.Column(db.String(100), default='image/jpeg')
    file_data = db.Column(db.LargeBinary, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @classmethod
    def normalize_key(cls, path_or_name: str) -> str:
        if not path_or_name:
            return ""
        clean = str(path_or_name).replace('\\', '/').strip()
        clean = clean.replace('/static/uploads/', '').replace('static/uploads/', '').lstrip('/')
        return clean

    @classmethod
    def save_bytes(cls, relative_path: str, data: bytes, content_type: str = 'image/jpeg'):
        if not data:
            return None
        clean_key = cls.normalize_key(relative_path)
        base_name = clean_key.split('/')[-1] if '/' in clean_key else clean_key
        
        try:
            record = cls.query.filter(
                (cls.file_path == clean_key) | 
                (cls.filename == base_name)
            ).first()

            if record:
                record.file_data = data
                record.content_type = content_type or record.content_type or 'image/jpeg'
                record.file_path = clean_key
                record.filename = base_name
            else:
                record = cls(
                    file_path=clean_key,
                    filename=base_name,
                    content_type=content_type or 'image/jpeg',
                    file_data=data
                )
                db.session.add(record)
            db.session.commit()
            return record
        except Exception:
            db.session.rollback()
            return None

    @classmethod
    def find_file(cls, path_or_filename: str):
        if not path_or_filename:
            return None
        clean_key = cls.normalize_key(path_or_filename)
        base_name = clean_key.split('/')[-1] if '/' in clean_key else clean_key

        return cls.query.filter(
            (cls.file_path == clean_key) |
            (cls.filename == base_name) |
            (cls.file_path.ilike(f"%{base_name}%"))
        ).first()

