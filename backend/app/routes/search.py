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

        # 키워드 검색 (빈 문자열이 아닐 때만)
        # Supabase Python 클라이언트는 or_() 메서드가 없으므로
        # 두 조건을 각각 검색하고 결과를 합치는 방식 사용
        keyword_ids = None
        if keyword:
            # name 또는 address에 키워드가 포함된 경우를 찾기 위해
            # 두 개의 쿼리를 실행하고 결과를 합침
            name_query = supabase.table('restaurants').select('restaurant_id').ilike('name', f'%{keyword}%')
            address_query = supabase.table('restaurants').select('restaurant_id').ilike('address', f'%{keyword}%')
            
            name_result = name_query.execute()
            address_result = address_query.execute()
            
            # 두 결과를 합치고 중복 제거 (restaurant_id 기준)
            name_ids = {item.get('restaurant_id') for item in (name_result.data or [])}
            address_ids = {item.get('restaurant_id') for item in (address_result.data or [])}
            keyword_ids = name_ids.union(address_ids)
            
            if not keyword_ids:
                # 키워드 검색 결과가 없으면 빈 결과 반환
                return jsonify({
                    "success": True,
                    "count": 0,
                    "data": []
                }), 200

        # 쿼리 시작
        query = supabase.table('restaurants').select('*')
        
        # 키워드 필터링 적용
        if keyword_ids:
            query = query.in_('restaurant_id', list(keyword_ids))

        # 카테고리 필터링 (다중 선택 지원)
        if category:
            # 쉼표로 구분된 카테고리 처리 (예: "한식,일식")
            categories = [c.strip() for c in category.split(',') if c.strip()]

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
        logging.error(f"검색 중 오류 발생: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"검색 중 오류가 발생했습니다: {str(e)}"
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
