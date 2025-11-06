from flask import Blueprint, request, jsonify
from app.config import supabase
import logging

search_bp = Blueprint('search', __name__)

# 공용 Supabase 클라이언트는 app.config에서 초기화하여 가져옵니다.


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

        query = supabase.table('restaurants').select('*')

        if keyword:
            query = query.or_(
                f'name.ilike.%{keyword}%,'
                f'address.ilike.%{keyword}%'
            )

        # 카테고리 필터링 (다중 선택 지원)
        if category:
            # 쉼표로 구분된 카테고리 처리 (예: "한식,일식")
            categories = [c.strip() for c in category.split(',')]

            # 화이트리스트 검증
            allowed_categories = ['한식', '양식', '중식', '일식', '카페', '기타']
            for cat in categories:
                if cat not in allowed_categories:
                    return jsonify({
                        "success": False,
                        "error": f"유효하지 않은 카테고리입니다: {cat}"
                    }), 400

            # 다중 카테고리 OR 조건
            if len(categories) == 1:
                query = query.eq('category', categories[0])
            else:
                # in_ 사용 (Supabase에서 IN 연산자)
                query = query.in_('category', categories)

        # 결과 개수 제한 (DoS 방지)
        response = query.limit(100).execute()

        return jsonify({
            "success": True,
            "count": len(response.data),
            "data": response.data
        }), 200

    except Exception as e:
        logging.error(f"검색 중 오류 발생: {str(e)}")
        return jsonify({
            "success": False,
            "error": "검색 중 오류가 발생했습니다."
        }), 500


@search_bp.route('/', methods=['GET'])
def get_all_restaurants():
    try:
        # 결과 개수 제한 (DoS 방지)
        response = supabase.table('restaurants').select('*').limit(150).execute()

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
