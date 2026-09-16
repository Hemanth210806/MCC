import os
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app import create_app
from app.extensions import db

env = os.environ.get('FLASK_ENV', 'development')
app = create_app(env)

# Ensure database tables exist and auto-seed if newly created
with app.app_context():
    db.create_all()
    try:
        from app.models.department import Department
        if Department.query.count() == 0:
            print("Database empty. Auto-seeding MCC initial data...")
            from seed.seed_data import seed_database
            seed_database()
            print("Auto-seed complete.")
    except Exception as e:
        print(f"Database init check: {e}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Mysuru Civic Connect (MCC) Backend on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=(env == 'development'))
