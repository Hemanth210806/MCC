import os
from flask import Flask, send_from_directory, redirect, send_file
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
        existing_users = {u.email: u for u in User.query.filter(User.role.in_(['admin', 'field_officer'])).all()}
        added = False
        for name, email, phone, role, department, password in accounts:
            user = existing_users.get(email)
            if not user:
                user = User(
                    name=name,
                    email=email,
                    phone=phone,
                    role=role,
                    department_id=department.id if department else None,
                )
                user.set_password(password)
                db.session.add(user)
                added = True
        if added:
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

    if config_name != 'testing':
        with app.app_context():
            db.create_all()
        _ensure_staff_accounts(app)
        with app.app_context():
            from app.models.department import Category, CategoryDepartmentMap, Department
            from app.models.user import User
            from app.models.ward import Ward
            from app.services.worker_assignment import ensure_all_ward_department_workers
            import json
            wards_file = os.path.join(os.path.dirname(__file__), '..', 'data', 'mysuru_wards.geojson')
            existing_ward_numbers = {w[0] for w in db.session.query(Ward.ward_number).all()}
            if len(existing_ward_numbers) < 65 and os.path.exists(wards_file):
                with open(wards_file, 'r', encoding='utf-8') as file:
                    ward_data = json.load(file)
                wards_to_add = []
                for feature in ward_data.get('features', []):
                    properties = feature['properties']
                    wno = properties['ward_number']
                    if wno not in existing_ward_numbers:
                        new_w = Ward(
                            ward_number=wno,
                            ward_name=properties['ward_name'],
                            geometry=feature['geometry'],
                        )
                        wards_to_add.append(new_w)
                        existing_ward_numbers.add(wno)
                if wards_to_add:
                    db.session.add_all(wards_to_add)
                    db.session.commit()
            ensure_all_ward_department_workers()
            category_departments = (
                ("Garbage / Waste", "Solid Waste Management"),
                ("Pothole / Road Damage", "Roads & Infrastructure"),
                ("Streetlight Failure", "Electrical & Street Lighting"),
                ("Water Supply & Sewerage", "Water Supply & Sewerage"),
                ("Water Leakage", "Water Supply & Sewerage"),
            )
            existing_cats = {c.name: c for c in Category.query.all()}
            existing_depts = {d.name: d for d in Department.query.all()}
            for category_name, department_name in category_departments:
                category = existing_cats.get(category_name)
                if not category:
                    category = Category(name=category_name)
                    db.session.add(category)
                    db.session.flush()
                    existing_cats[category_name] = category
                department = existing_depts.get(department_name)
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
            existing_demo_emails = {u.email: u for u in User.query.filter(User.email.in_([w[1] for w in demo_workers])).all()}
            demo_added = False
            for name, email, phone, ward_name, department_name in demo_workers:
                if email in existing_demo_emails:
                    continue
                ward = Ward.query.filter(Ward.ward_name.in_((ward_name, f"{ward_name}puram"))).first()
                department = Department.query.filter_by(name=department_name).first()
                if ward and department:
                    worker = User(
                        name=name,
                        email=email,
                        phone=phone,
                        role='ward_worker',
                        ward_id=ward.id,
                        department_id=department.id
                    )
                    worker.set_password('Worker@123')
                    db.session.add(worker)
                    demo_added = True
            if demo_added:
                db.session.commit()
    # Determine frontend build directory (local development or production on Render).
    # Prefer the actual frontend build over any stale backend dist folder so the app
    # does not keep serving an older compiled bundle after a rebuild.
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    possible_dist_dirs = [
        os.path.join(backend_dir, 'dist'),
        os.path.abspath(os.path.join(backend_dir, '..', 'frontend', 'dist')),
        os.path.join(backend_dir, 'frontend_dist')
    ]
    frontend_dist = next((d for d in possible_dist_dirs if os.path.exists(d) and os.path.exists(os.path.join(d, 'index.html'))), None)

    if config_name != 'testing':
        with app.app_context():
            # Backfill any existing ComplaintImage into persistent StoredFile if matched in assets
            try:
                from app.models.stored_file import StoredFile
                from app.models.complaint import ComplaintImage
                for c_img in ComplaintImage.query.all():
                    if c_img.image_path:
                        base_name = os.path.basename(c_img.image_path)
                        if not StoredFile.find_file(base_name):
                            for sdir in [
                                os.path.abspath(os.path.join(backend_dir, '..', 'frontend', 'public', 'images')),
                                os.path.join(backend_dir, 'dist', 'images'),
                                os.path.join(backend_dir, 'static', 'images')
                            ]:
                                if os.path.exists(sdir):
                                    for root, _, files in os.walk(sdir):
                                        for fname in files:
                                            if fname == base_name or (len(base_name) > 10 and fname in base_name):
                                                match_path = os.path.join(root, fname)
                                                try:
                                                    with open(match_path, 'rb') as mf:
                                                        StoredFile.save_bytes(c_img.image_path, mf.read())
                                                except Exception:
                                                    pass
            except Exception:
                pass

    # Static file serving for uploads in dev/production with persistent database fallback
    @app.route('/static/uploads/<path:filename>')
    @app.route('/api/uploads/<path:filename>')
    def serve_upload(filename):
        # 1. Direct local disk serving if file exists
        target_path = os.path.join(upload_dir, filename)
        if os.path.exists(target_path) and os.path.isfile(target_path):
            response = send_from_directory(upload_dir, filename)
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Cache-Control'] = 'public, max-age=86400'
            return response

        # 2. Check if file is stored in persistent database (StoredFile)
        try:
            from app.models.stored_file import StoredFile
            stored = StoredFile.find_file(filename)
            if stored and stored.file_data:
                # Re-hydrate file to local disk for fast subsequent serving
                try:
                    os.makedirs(os.path.dirname(target_path), exist_ok=True)
                    with open(target_path, 'wb') as f:
                        f.write(stored.file_data)
                    response = send_from_directory(upload_dir, filename)
                    response.headers['Access-Control-Allow-Origin'] = '*'
                    response.headers['Cache-Control'] = 'public, max-age=86400'
                    return response
                except Exception:
                    # Serve directly from memory if writing to disk fails
                    from io import BytesIO
                    resp = send_file(BytesIO(stored.file_data), mimetype=stored.content_type or 'image/jpeg')
                    resp.headers['Access-Control-Allow-Origin'] = '*'
                    resp.headers['Cache-Control'] = 'public, max-age=86400'
                    return resp
        except Exception as e:
            app.logger.warning(f"Error restoring {filename} from database: {e}")

        # 3. Check repository asset directories for seed/demo matching filename
        base_name = os.path.basename(filename)
        search_dirs = [
            os.path.abspath(os.path.join(backend_dir, '..', 'frontend', 'public', 'images')),
            os.path.join(backend_dir, 'dist', 'images'),
            os.path.join(backend_dir, 'static', 'images'),
            os.path.join(backend_dir, 'app', 'static')
        ]
        for sdir in search_dirs:
            if os.path.exists(sdir):
                for root, _, files in os.walk(sdir):
                    for fname in files:
                        if fname == base_name or (len(base_name) > 10 and fname in base_name):
                            match_src = os.path.join(root, fname)
                            try:
                                os.makedirs(os.path.dirname(target_path), exist_ok=True)
                                import shutil
                                shutil.copy2(match_src, target_path)
                                # Persist it into DB so it's permanent
                                try:
                                    with open(match_src, 'rb') as mf:
                                        from app.models.stored_file import StoredFile
                                        StoredFile.save_bytes(filename, mf.read())
                                except Exception:
                                    pass
                                response = send_from_directory(upload_dir, filename)
                                response.headers['Access-Control-Allow-Origin'] = '*'
                                response.headers['Cache-Control'] = 'public, max-age=86400'
                                return response
                            except Exception:
                                pass

        # 4. If file is completely unavailable, gracefully redirect to category fallback instead of returning a broken 404
        try:
            from app.models.complaint import ComplaintImage, Complaint
            c_img = ComplaintImage.query.filter(ComplaintImage.image_path.like(f"%{base_name}%")).first()
            category_name = c_img.complaint.category.name if (c_img and c_img.complaint and c_img.complaint.category) else ''
        except Exception:
            category_name = ''

        fallback_urls = {
            'garbage': 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=80',
            'pothole': 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
            'streetlight': 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80',
            'water': 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
            'default': 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80'
        }
        cat_lower = (category_name or '').lower()
        key = 'default'
        for k in ('garbage', 'pothole', 'streetlight', 'water'):
            if k in cat_lower:
                key = k
                break
        return redirect(fallback_urls[key], code=302)

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
