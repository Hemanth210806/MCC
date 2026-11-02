import os
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app import create_app

# Default to a stable non-reloader startup so local runs do not die or restart unexpectedly.
env = os.environ.get('FLASK_ENV', 'production')
app = create_app(env)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_DEBUG', '0').lower() in ('1', 'true', 'yes', 'on')
    if env == 'development' and not debug_mode:
        debug_mode = True

    print(f"Starting Mysuru Civic Connect (MCC) Backend on port {port}... (debug={debug_mode}, reloader=False)")
    app.run(host='0.0.0.0', port=port, debug=debug_mode, use_reloader=False, threaded=True)
