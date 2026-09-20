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

    # Automatic schema migration for new columns
    with app.app_context():
        try:
            from sqlalchemy import text
            with db.engine.connect() as conn:
                res = conn.execute(text("PRAGMA table_info(complaints)")).fetchall()
                existing_cols = [r[1] for r in res] if res else []
                if existing_cols:
                    if 'report_count' not in existing_cols:
                        conn.execute(text("ALTER TABLE complaints ADD COLUMN report_count INTEGER DEFAULT 1"))
                        conn.commit()
                    if 'merged_into_complaint_id' not in existing_cols:
                        conn.execute(text("ALTER TABLE complaints ADD COLUMN merged_into_complaint_id INTEGER NULL"))
                        conn.commit()
                else:
                    try:
                        conn.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 1"))
                        conn.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS merged_into_complaint_id INTEGER NULL"))
                        conn.commit()
                    except Exception:
                        pass
        except Exception as e:
            app.logger.info(f"Schema check note: {e}")

        # Synchronize official 65 MCC wards in database
        try:
            from app.models.ward import Ward
            import json
            wards_file = os.path.join(os.path.abspath(os.path.dirname(__file__)), '..', 'data', 'mysuru_wards.geojson')
            if os.path.exists(wards_file):
                with open(wards_file, 'r', encoding='utf-8') as f:
                    wdata = json.load(f)
                synced_count = 0
                for feat in wdata.get('features', []):
                    p = feat['properties']
                    wno = p['ward_number']
                    wname = p['ward_name']
                    wobj = Ward.query.filter_by(ward_number=wno).first()
                    if wobj:
                        if wobj.ward_name != wname or wobj.geometry != feat['geometry']:
                            wobj.ward_name = wname
                            wobj.geometry = feat['geometry']
                            synced_count += 1
                    else:
                        new_ward = Ward(ward_number=wno, ward_name=wname, geometry=feat['geometry'])
                        db.session.add(new_ward)
                        synced_count += 1
                if synced_count > 0:
                    db.session.commit()
                    app.logger.info(f"Synchronized {synced_count} official MCC wards in database.")
        except Exception as e:
            app.logger.info(f"Ward sync note: {e}")

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

    # Determine frontend build directory (local development or production on Render)
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    possible_dist_dirs = [
        os.path.join(backend_dir, 'dist'),
        os.path.abspath(os.path.join(backend_dir, '..', 'frontend', 'dist')),
        os.path.join(backend_dir, 'frontend_dist')
    ]
    frontend_dist = next((d for d in possible_dist_dirs if os.path.exists(d) and os.path.exists(os.path.join(d, 'index.html'))), None)

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
            'city': 'Mysuru',
            'frontend_served': frontend_dist is not None
        }, 200

    # Serve Frontend Single Page App from Render root
    if frontend_dist:
        @app.route('/', defaults={'path': ''})
        @app.route('/<path:path>')
        def serve_frontend(path):
            if path.startswith('api/') or path.startswith('static/'):
                return {"error": "Not Found"}, 404
            
            target_path = os.path.join(frontend_dist, path)
            if path and os.path.exists(target_path) and not os.path.isdir(target_path):
                return send_from_directory(frontend_dist, path)
            return send_from_directory(frontend_dist, 'index.html')
    else:
        @app.route('/')
        def serve_fallback_root():
            return {
                'service': 'Mysuru Civic Connect (MCC) API & Backend',
                'status': 'online',
                'api_base': '/api',
                'health_check': '/api/health',
                'frontend_status': 'Connect via Vercel (https://mysuru-civic-connect.vercel.app) or build frontend dist'
            }, 200

    return app

