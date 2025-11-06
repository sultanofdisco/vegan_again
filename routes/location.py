from flask import Blueprint, request, jsonify, make_response
from supabase import create_client
from functools import wraps
import os

location_bp = Blueprint('location', __name__)

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_KEY')
)


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return jsonify({
                "success": False,
                "error": "로그인이 필요한 서비스입니다."
            }), 401

        try:
            token = auth_header.split(' ')[1]
            user = supabase.auth.get_user(token)
            kwargs['user_id'] = user.user.id
            return f(*args, **kwargs)

        except Exception as e:
            print(f"인증 오류: {str(e)}")
            return jsonify({
                "success": False,
                "error": "유효하지 않은 토큰입니다."
            }), 401

    return decorated_function


@location_bp.route('/location-consent', methods=['POST'])
def update_location_consent(user_id):
    try:
        data = request.get_json()

        if 'consent' not in data:
            return jsonify({
                "success": False,
                "error": "동의 여부(consent)를 전달해주세요."
            }), 400

        consent = data['consent']
        if not isinstance(consent, bool):
            return jsonify({
                "success": False,
                "error": "동의 여부는 true 또는 false여야 합니다."
            }), 400

        supabase.table('users') \
            .update({'location_consent': consent}) \
            .eq('user_id', user_id) \
            .execute()

        message = "위치정보 제공에 동의하셨습니다." if consent else "위치정보 제공 동의를 철회하셨습니다."

        response = make_response(jsonify({
            "success": True,
            "message": message,
            "consent": consent
        }))

        response.set_cookie(
            'location_consent',
            str(consent).lower(),
            max_age=30 * 24 * 60 * 60,
            httponly=False,
            secure=False,
            samesite='Lax'
        )

        return response, 200

    except Exception as e:
        print(f"위치정보 동의 업데이트 오류: {str(e)}")
        return jsonify({
            "success": False,
            "error": "위치정보 동의 처리 중 오류가 발생했습니다."
        }), 500


@location_bp.route('/location-consent', methods=['GET'])
def get_location_consent(user_id):
    try:
        cookie_consent = request.cookies.get('location_consent')

        if cookie_consent:
            return jsonify({
                "success": True,
                "consent": cookie_consent == 'true',
                "source": "cookie"
            }), 200

        response = supabase.table('users') \
            .select('location_consent') \
            .eq('user_id', user_id) \
            .single() \
            .execute()

        return jsonify({
            "success": True,
            "consent": response.data.get('location_consent', False),
            "source": "database"
        }), 200

    except Exception as e:
        print(f"위치정보 동의 상태 조회 오류: {str(e)}")
        return jsonify({
            "success": False,
            "error": "동의 상태를 확인하는 중 오류가 발생했습니다."
        }), 500