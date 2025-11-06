from flask import Blueprint, request, jsonify
from app.config import supabase
from functools import wraps

bookmarks_bp = Blueprint('bookmarks', __name__)

# Supabase 클라이언트는 app.config에서 초기화된 인스턴스를 사용합니다.


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


@bookmarks_bp.route('/bookmarks/<restaurant_id>', methods=['POST'])
@login_required
def add_bookmark(restaurant_id, user_id):
    try:
        existing = supabase.table('favorites') \
            .select('*') \
            .eq('user_id', user_id) \
            .eq('restaurant_id', restaurant_id) \
            .execute()

        if existing.data:
            return jsonify({
                "success": False,
                "error": "이미 즐겨찾기에 추가된 식당입니다."
            }), 400

        supabase.table('favorites').insert({
            'user_id': user_id,
            'restaurant_id': restaurant_id
        }).execute()

        return jsonify({
            "success": True,
            "message": "즐겨찾기에 추가되었습니다."
        }), 201

    except Exception as e:
        print(f"즐겨찾기 추가 오류: {str(e)}")
        return jsonify({
            "success": False,
            "error": "즐겨찾기 추가 중 오류가 발생했습니다."
        }), 500


@bookmarks_bp.route('/bookmarks/<restaurant_id>', methods=['DELETE'])
@login_required
def remove_bookmark(restaurant_id, user_id):
    try:
        existing = supabase.table('favorites') \
            .select('*') \
            .eq('user_id', user_id) \
            .eq('restaurant_id', restaurant_id) \
            .execute()

        if not existing.data:
            return jsonify({
                "success": False,
                "error": "즐겨찾기에 없는 식당입니다."
            }), 404

        supabase.table('favorites') \
            .delete() \
            .eq('user_id', user_id) \
            .eq('restaurant_id', restaurant_id) \
            .execute()

        return jsonify({
            "success": True,
            "message": "즐겨찾기에서 삭제되었습니다."
        }), 200

    except Exception as e:
        print(f"즐겨찾기 삭제 오류: {str(e)}")
        return jsonify({
            "success": False,
            "error": "즐겨찾기 삭제 중 오류가 발생했습니다."
        }), 500


@bookmarks_bp.route('/bookmarks', methods=['GET'])
@login_required
def get_bookmarks(user_id):
    try:
        response = supabase.table('favorites') \
            .select('*, restaurants(*)') \
            .eq('user_id', user_id) \
            .execute()

        return jsonify({
            "success": True,
            "count": len(response.data),
            "data": response.data
        }), 200

    except Exception as e:
        print(f"즐겨찾기 목록 조회 오류: {str(e)}")
        return jsonify({
            "success": False,
            "error": "즐겨찾기 목록을 불러오는 중 오류가 발생했습니다."
        }), 500
