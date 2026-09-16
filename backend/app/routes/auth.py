from functools import wraps
from datetime import datetime, timedelta
import jwt
from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models.user import User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def generate_jwt(user: User) -> str:
    payload = {
        'user_id': user.id,
        'email': user.email,
        'role': user.role,
        'department_id': user.department_id,
        'ward_id': user.ward_id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow()
    }
    secret = current_app.config.get('JWT_SECRET_KEY', 'default_secret')
    return jwt.encode(payload, secret, algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Authorization token is missing'}), 401
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Invalid Authorization header format. Expected Bearer <token>'}), 401

        token = parts[1]
        secret = current_app.config.get('JWT_SECRET_KEY', 'default_secret')
        try:
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            user = User.query.get(payload['user_id'])
            if not user:
                return jsonify({'error': 'User not found or inactive'}), 401
            request.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        return f(*args, **kwargs)
    return decorated

def roles_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated_function(*args, **kwargs):
            user = getattr(request, 'current_user', None)
            if not user or user.role not in allowed_roles:
                return jsonify({
                    'error': f'Access forbidden: requires one of roles: {list(allowed_roles)}'
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = generate_jwt(user)
    return jsonify({
        'token': token,
        'user': user.to_dict(),
        'message': f'Welcome back, {user.name}'
    }), 200

@auth_bp.route('/logout', methods=['POST'])
def logout():
    # Client removes token
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user():
    return jsonify({'user': request.current_user.to_dict()}), 200
