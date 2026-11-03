import os
from flask import Flask, send_from_directory
from app.config import config_by_name
from app.extensions import db, cors

def _initialize_database(app):
    with app.app_context():
        db.create_all()
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
                    migration_columns = {
                        'assigned_worker_id': 'INTEGER NULL',
                        'assigned_at': 'DATETIME NULL',
                        'assigned_by_user_id': 'INTEGER NULL',
                        'progress_percent': 'INTEGER DEFAULT 0',
                        'progress_note': 'TEXT NULL',
                        'progress_updated_at': 'DATETIME NULL',
                    }
                    for column, definition in migration_columns.items():
                        if column not in existing_cols:
                            conn.execute(text(f"ALTER TABLE complaints ADD COLUMN {column} {definition}"))
                            conn.commit()
                else:
                    try:
                        conn.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 1"))
                        conn.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS merged_into_complaint_id INTEGER NULL"))
                        conn.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_worker_id INTEGER NULL"))
                        conn.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_at DATETIME NULL"))
                        conn.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_by_user_id INTEGER NULL"))
                        conn.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0"))
                        conn.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS progress_note TEXT NULL"))
                        conn.execute(text("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS progress_updated_at DATETIME NULL"))
                        conn.commit()
                    except Exception:
                        pass
        except Exception as e:
            app.logger.info(f"Schema check note: {e}")

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
                    wobj = Ward.query.filter_by(ward_number=p['ward_number']).first()
                    if wobj:
                        if wobj.ward_name != p['ward_name'] or wobj.geometry != feat['geometry']:
                            wobj.ward_name = p['ward_name']
                            wobj.geometry = feat['geometry']
                            synced_count += 1
                    else:
                        db.session.add(Ward(
                            ward_number=p['ward_number'],
                            ward_name=p['ward_name'],
                            geometry=feat['geometry'],
                        ))
                        synced_count += 1
                if synced_count > 0:
                    db.session.commit()
                    app.logger.info(f"Synchronized {synced_count} official MCC wards in database.")
        except Exception as e:
            app.logger.info(f"Ward sync note: {e}")

        try:
            from seed.seed_data import ensure_ward_department_workers
            ensure_ward_department_workers()
        except Exception as e:
            app.logger.info(f"Worker directory sync note: {e}")

        try:
            from app.models.department import Department
            if Department.query.count() == 0:
                from seed.seed_data import seed_database
                seed_database()
            from seed.seed_data import ensure_demo_workers
            ensure_demo_workers()
        except Exception as e:
            app.logger.info(f"Database seed note: {e}")

def _ensure_staff_accounts(app):
    with app.app_context():
        from app.models.department import Department
        from app.models.user import User

        departments = {}
        for name in (
            "Solid Waste Management",
            "Roads & Infrastructure",
            "Electrical & Street Lighting",
            "Water Supply & Sewerage",
        ):
            department = Department.query.filter_by(name=name).first()
            if not department:
                department = Department(name=name, description=f"{name} department")
                db.session.add(department)
                db.session.flush()
            departments[name] = department

        accounts = (
            ("MCC Administrator", "admin@mcc.gov.in", "9880012345", "admin", None, "Admin@123"),
            ("Ramesh Kumar", "swm.officer@mcc.gov.in", "9880022001", "field_officer", departments["Solid Waste Management"], "Officer@123"),
            ("Suresh Gowda", "roads.officer@mcc.gov.in", "9880033001", "field_officer", departments["Roads & Infrastructure"], "Officer@123"),
            ("Vijay Bhaskar", "elec.officer@mcc.gov.in", "9880044001", "field_officer", departments["Electrical & Street Lighting"], "Officer@123"),
            ("Manjunath Swamy", "water.officer@mcc.gov.in", "9880055001", "field_officer", departments["Water Supply & Sewerage"], "Officer@123"),
        )
        for name, email, phone, role, department, password in accounts:
            user = User.query.filter_by(email=email).first()
            if not user:
                user = User(email=email)
                db.session.add(user)
            user.name = name
            user.phone = phone
            user.role = role
            user.department_id = department.id if department else None
            user.set_password(password)
        db.session.commit()

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

    with app.app_context():
        db.create_all()
    _ensure_staff_accounts(app)
    with app.app_context():
        from app.models.department import Category, CategoryDepartmentMap, Department
        from app.models.user import User
        from app.models.ward import Ward
        import json
        wards_file = os.path.join(os.path.dirname(__file__), '..', 'data', 'mysuru_wards.geojson')
        if os.path.exists(wards_file):
            with open(wards_file, 'r', encoding='utf-8') as file:
                ward_data = json.load(file)
            for feature in ward_data.get('features', []):
                properties = feature['properties']
                ward = Ward.query.filter_by(ward_number=properties['ward_number']).first()
                if not ward:
                    db.session.add(Ward(
                        ward_number=properties['ward_number'],
                        ward_name=properties['ward_name'],
                        geometry=feature['geometry'],
                    ))
            db.session.commit()
        category_departments = (
            ("Garbage / Waste", "Solid Waste Management"),
            ("Pothole / Road Damage", "Roads & Infrastructure"),
            ("Streetlight Failure", "Electrical & Street Lighting"),
            ("Water Leakage", "Water Supply & Sewerage"),
        )
        for category_name, department_name in category_departments:
            category = Category.query.filter_by(name=category_name).first()
            if not category:
                category = Category(name=category_name)
                db.session.add(category)
                db.session.flush()
            department = Department.query.filter_by(name=department_name).first()
            if department and not CategoryDepartmentMap.query.filter_by(
                category_id=category.id,
                department_id=department.id,
            ).first():
                db.session.add(CategoryDepartmentMap(
                    category_id=category.id,
                    department_id=department.id,
                ))
        db.session.commit()
        demo_workers = (
            ("Agrahara Ward Worker", "agrahara.worker@mcc.gov.in", "9880022102", "Agrahara", "Solid Waste Management"),
            ("Vidhyaranyapuram Ward Worker", "vidhya.worker@mcc.gov.in", "9880033102", "Vidhyaranyapuram", "Roads & Infrastructure"),
        )
        for name, email, phone, ward_name, department_name in demo_workers:
            ward = Ward.query.filter(Ward.ward_name.in_((ward_name, f"{ward_name}puram"))).first()
            department = Department.query.filter_by(name=department_name).first()
            if ward and department:
                worker = User.query.filter_by(email=email).first()
                if not worker:
                    worker = User(email=email)
                    db.session.add(worker)
                worker.name = name
                worker.phone = phone
                worker.role = 'ward_worker'
                worker.ward_id = ward.id
                worker.department_id = department.id
                worker.set_password('Worker@123')
        db.session.commit()
    # Determine frontend build directory (local development or production on Render).
    # Prefer the actual frontend build over any stale backend dist folder so the app
    # does not keep serving an older compiled bundle after a rebuild.
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    possible_dist_dirs = [
        os.path.abspath(os.path.join(backend_dir, '..', 'frontend', 'dist')),
        os.path.join(backend_dir, 'dist'),
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
