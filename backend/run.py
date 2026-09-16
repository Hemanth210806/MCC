import os
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app import create_app
from app.extensions import db

env = os.environ.get('FLASK_ENV', 'development')
app = create_app(env)

if __name__ == '__main__':
    with app.app_context():
        # Ensure tables exist
        db.create_all()
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Mysuru Civic Connect (MCC) Backend on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=(env == 'development'))
