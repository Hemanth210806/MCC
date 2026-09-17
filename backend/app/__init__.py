import os
from flask import Flask, send_from_directory
from app.config import config_by_name
from app.extensions import db, cors

def create_app(config_name='development'):
    app = Flask(__name__, static_folder='static')
    app.config.from_object(config_by_name.get(config_name, config_by_name['development']))

    # Initialize extensions
    db.init_app(app)
    cors.init_app(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # Ensure uploads folder exists
    upload_dir = app.config.get('UPLOAD_FOLDER')
    os.makedirs(upload_dir, exist_ok=True)
    os.makedirs(os.path.join(upload_dir, 'complaints'), exist_ok=True)
    os.makedirs(os.path.join(upload_dir, 'resolutions'), exist_ok=True)

    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.complaints import complaints_bp
    from app.routes.public_map import public_map_bp
    from app.routes.officer import officer_bp
    from app.routes.corporator import corporator_bp
    from app.routes.admin import admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(complaints_bp)
    app.register_blueprint(public_map_bp)
    app.register_blueprint(officer_bp)
    app.register_blueprint(corporator_bp)
    app.register_blueprint(admin_bp)

    # Static file serving for uploads in dev/production
    @app.route('/static/uploads/<path:filename>')
    @app.route('/api/uploads/<path:filename>')
    def serve_upload(filename):
        response = send_from_directory(upload_dir, filename)
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return {
            'status': 'healthy',
            'service': 'Mysuru Civic Connect (MCC) API',
            'version': '2.0',
            'city': 'Mysuru'
        }, 200

    return app
