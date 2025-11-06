from flask import Blueprint
from app.auth.signup import signup_user
from app.auth.login import login_user
from app.auth.logout import logout_user

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# 회원가입 라우트 등록
auth_bp.add_url_rule('/signup', 'signup', signup_user, methods=['POST'])

# 로그인 라우트 등록
auth_bp.add_url_rule('/login', 'login', login_user, methods=['POST'])

# 로그아웃 라우트 등록
auth_bp.add_url_rule('/logout', 'logout', logout_user, methods=['POST'])

