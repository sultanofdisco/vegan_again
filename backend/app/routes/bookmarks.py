from flask import Blueprint, request, jsonify, session
from app.config import supabase
from app.auth.session import validate_session_security
from functools import wraps
import logging

bookmarks_bp = Blueprint('bookmarks', __name__)
logger = logging.getLogger(__name__)

# Supabase 클라이언트는 app.config에서 초기화된 인스턴스를 사용합니다.


def login_required(f):
    """세션 기반 로그인 확인 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 세션에서 로그인 상태 확인
        if not session.get('logged_in'):
            return jsonify({
                "success": False,
                "error": "로그인이 필요한 서비스입니다."
            }), 401
        
        # 세션 보안 검증
        if not validate_session_security():
            return jsonify({
                "success": False,
                "error": "세션이 유효하지 않습니다. 다시 로그인해주세요."
            }), 401
        
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({
                "success": False,
                "error": "사용자 정보를 찾을 수 없습니다."
            }), 401
        
        # 세션 토큰 확인
        session_token = session.get('session_token')
        if not session_token:
            logger.warning(f'세션 토큰 없음: User ID={user_id}')
            return jsonify({
                "success": False,
                "error": "세션이 유효하지 않습니다. 다시 로그인해주세요."
            }), 401
        
        kwargs['user_id'] = user_id
        return f(*args, **kwargs)
    
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
        logger.error(f"즐겨찾기 추가 오류: {str(e)}", exc_info=True)
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
        logger.error(f"즐겨찾기 삭제 오류: {str(e)}", exc_info=True)
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
        logger.error(f"즐겨찾기 목록 조회 오류: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "즐겨찾기 목록을 불러오는 중 오류가 발생했습니다."
        }), 500
