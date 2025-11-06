from flask import Blueprint, request, jsonify
from supabase import create_client
import os
import logging

search_bp = Blueprint('search', __name__)

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_KEY')
)


@search_bp.route('/search', methods=['GET'])
def search_restaurants():
    try:
        keyword = request.args.get('keyword', '').strip()
        category = request.args.get('category', '').strip()

        # 입력값 길이 제한 (DoS 방지)
        if keyword and len(keyword) > 100:
            return jsonify({
                "success": False,
                "error": "검색어는 100자 이하로 입력해주세요."
            }), 400

        if keyword and len(keyword) < 2:
            return jsonify({
                "success": False,
                "error": "검색어는 최소 2글자 이상 입력해주세요."
            }), 400

        # 카테고리 화이트리스트 검증
        allowed_categories = ['한식', '양식', '중식', '일식', '카페', '분식', '기타', '']
        if category not in allowed_categories:
            return jsonify({
                "success": False,
                "error": "유효하지 않은 카테고리입니다."
            }), 400

        query = supabase.table('restaurants').select('*')

        if keyword:
            query = query.or_(
                f'name.ilike.%{keyword}%,'
                f'address.ilike.%{keyword}%'
            )

        if category:
            query = query.eq('category', category)

        # 결과 개수 제한 (DoS 방지)
        response = query.limit(100).execute()

        return jsonify({
            "success": True,
            "count": len(response.data),
            "data": response.data
        }), 200

    except Exception as e:
        # 보안: 상세 에러는 로그에만, 사용자에게는 일반 메시지
        logging.error(f"검색 중 오류 발생: {str(e)}")
        return jsonify({
            "success": False,
            "error": "검색 중 오류가 발생했습니다."
        }), 500


@search_bp.route('/', methods=['GET'])
def get_all_restaurants():
    try:
        # 결과 개수 제한 (DoS 방지)
        response = supabase.table('restaurants').select('*').limit(100).execute()

        return jsonify({
            "success": True,
            "count": len(response.data),
            "data": response.data
        }), 200

    except Exception as e:
        logging.error(f"식당 목록 조회 중 오류: {str(e)}")
        return jsonify({
            "success": False,
            "error": "식당 목록을 불러오는 중 오류가 발생했습니다."
        }), 500