from flask import Blueprint, request, jsonify, session
from app.config import supabase
from app.auth.session import validate_session_security
from app.auth.validators import sanitize_input, validate_base64_image, validate_image_url, validate_review_title, validate_review_content
from functools import wraps
from datetime import datetime
import logging
import re
import base64
import os

reviews_bp = Blueprint('reviews', __name__)
logger = logging.getLogger(__name__)


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
            return jsonify({
                "success": False,
                "error": "세션이 유효하지 않습니다. 다시 로그인해주세요."
            }), 401
        
        kwargs['user_id'] = user_id
        return f(*args, **kwargs)
    
    return decorated_function


def check_review_ownership(review_id, user_id):
    """리뷰 소유권 확인 (IDOR 방지)"""
    try:
        result = supabase.table('reviews') \
            .select('user_id, restaurant_id') \
            .eq('review_id', review_id) \
            .execute()
        
        if not result.data:
            return False, None
        
        review_user_id = result.data[0]['user_id']
        restaurant_id = result.data[0].get('restaurant_id')
        
        # 소유권 확인
        if review_user_id != user_id:
            return False, restaurant_id
        
        return True, restaurant_id
    except Exception as e:
        logger.error(f"리뷰 소유권 확인 오류: {str(e)}", exc_info=True)
        return False, None


def upload_image_to_storage(image_base64: str, user_id: int) -> str | None:
    """
    Base64 이미지를 Supabase Storage에 업로드하고 Public URL 반환
    """
    try:
        import base64
        
        # Base64 데이터 추출
        if not image_base64.startswith('data:image/'):
            logger.error(f"잘못된 Base64 형식: {image_base64[:50]}...")
            return None
        
        # MIME 타입 추출
        mime_match = re.match(r'data:(image/[a-zA-Z0-9\-\.]+);base64,', image_base64)
        if not mime_match:
            logger.error("MIME 타입 추출 실패")
            return None
        
        mime_type = mime_match.group(1)
        base64_data = image_base64.split(',')[1]
        
        # 파일 확장자 결정
        mime_to_ext = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp'
        }
        file_ext = mime_to_ext.get(mime_type, 'jpg')
        
        # Base64 디코딩
        try:
            image_data = base64.b64decode(base64_data, validate=True)
        except Exception as e:
            logger.error(f"Base64 디코딩 실패: {str(e)}")
            return None
        
        # 파일 크기 검증 (5MB)
        MAX_FILE_SIZE = 5 * 1024 * 1024
        if len(image_data) > MAX_FILE_SIZE:
            logger.error(f"파일 크기 초과: {len(image_data)} bytes")
            return None
        
        # 파일 경로 생성
        timestamp = int(datetime.now().timestamp() * 1000)
        random_str = os.urandom(8).hex()
        path = f"reviews/{user_id}/{timestamp}_{random_str}.{file_ext}"
    
        
        try:
            # Supabase Python 클라이언트의 Storage API 사용
            upload_result = supabase.storage.from_('review_images').upload(
                path=path,
                file=image_data,
                file_options={
                    "content-type": mime_type,
                    "cache-control": "3600"
                }
            )
            
            # 업로드 응답 확인
            if hasattr(upload_result, 'error') and upload_result.error:
                logger.error(f"이미지 업로드 실패: {upload_result.error}")
                return None
            
            # Public URL 가져오기
            url_result = supabase.storage.from_('review_images').get_public_url(path)
            
            if url_result:
                public_url = url_result
                return public_url
            else:
                logger.error("Public URL 가져오기 실패")
                return None
                
        except Exception as storage_error:
            logger.error(f"Storage 업로드 중 오류: {type(storage_error).__name__}: {str(storage_error)}", exc_info=True)
            return None
            
    except Exception as e:
        logger.error(f"이미지 업로드 중 오류 발생: {type(e).__name__}", exc_info=True)
        return None


def check_restaurant_exists(restaurant_id):
    """식당 존재 확인"""
    try:
        result = supabase.table('restaurants') \
            .select('restaurant_id') \
            .eq('restaurant_id', restaurant_id) \
            .execute()
        
        return bool(result.data)
    except Exception as e:
        logger.error(f"식당 존재 확인 오류: {str(e)}", exc_info=True)
        return False


@reviews_bp.route('/users/reviews', methods=['GET'])
@login_required
def get_user_reviews(user_id):
    """사용자가 작성한 리뷰 목록 조회"""    
    try:
        # 쿼리 파라미터에서 페이지네이션 정보 가져오기
        page = request.args.get('page', default=1, type=int)
        limit = request.args.get('limit', default=20, type=int)
        
        # 페이지네이션 검증
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:  # 최대 100개로 제한
            limit = 20
        
        # 오프셋 계산
        offset = (page - 1) * limit
        
        # 리뷰 목록 조회 (restaurants 정보는 별도로 조회)
        result = supabase.table('reviews') \
            .select('review_id, restaurant_id, content, rating, image_url, created_at, updated_at') \
            .eq('user_id', user_id) \
            .order('created_at', desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
        
        # 전체 개수 조회 (페이지네이션용) - 더 간단한 방식
        try:
            count_result = supabase.table('reviews') \
                .select('review_id', count='exact') \
                .eq('user_id', user_id) \
                .execute()
            
            # Supabase count 응답 처리
            if hasattr(count_result, 'count') and count_result.count is not None:
                total_count = count_result.count
            else:
                total_count = len(result.data) if result.data else 0
        except Exception as e:
            total_count = len(result.data) if result.data else 0
        
        total_pages = (total_count + limit - 1) // limit if limit > 0 else 1
        
        # 식당 ID 목록 추출
        restaurant_ids = []
        if result.data:
            restaurant_ids = [item.get('restaurant_id') for item in result.data if item.get('restaurant_id')]
            restaurant_ids = list(set(restaurant_ids))  # 중복 제거
        
        # 식당 정보 일괄 조회
        restaurants_map = {}
        if restaurant_ids:
            try:
                restaurants_result = supabase.table('restaurants') \
                    .select('restaurant_id, name') \
                    .in_('restaurant_id', restaurant_ids) \
                    .execute()
                
                if restaurants_result.data:
                    restaurants_map = {r.get('restaurant_id'): r.get('name', '알 수 없음') for r in restaurants_result.data}
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": "식당 정보 일괄 조회에 실패했습니다. "
                }), 500
        
        # 응답 형식 변환
        reviews = []
        if result.data:
            for item in result.data:
                restaurant_id = item.get('restaurant_id')
                restaurant_name = restaurants_map.get(restaurant_id, '알 수 없음')
                
                # 날짜 형식 확인 및 변환 (ISO 8601 형식으로 보장)
                created_at = item.get('created_at')
                updated_at = item.get('updated_at')
                
                # created_at 처리
                created_at_str = None
                if created_at:
                    if isinstance(created_at, str):
                        # 문자열인 경우 그대로 사용 (이미 ISO 형식일 가능성)
                        created_at_str = created_at if created_at.strip() else None
                    elif isinstance(created_at, datetime):
                        # datetime 객체인 경우 ISO 형식으로 변환
                        created_at_str = created_at.isoformat()
                    else:
                        # 다른 타입인 경우 문자열로 변환 시도
                        try:
                            created_at_str = str(created_at) if created_at else None
                        except:
                            created_at_str = None
                
                # updated_at 처리
                updated_at_str = None
                if updated_at:
                    if isinstance(updated_at, str):
                        # 문자열인 경우 그대로 사용 (이미 ISO 형식일 가능성)
                        updated_at_str = updated_at if updated_at.strip() else None
                    elif isinstance(updated_at, datetime):
                        # datetime 객체인 경우 ISO 형식으로 변환
                        updated_at_str = updated_at.isoformat()
                    else:
                        # 다른 타입인 경우 문자열로 변환 시도
                        try:
                            updated_at_str = str(updated_at) if updated_at else None
                        except:
                            updated_at_str = None
                
                review_data = {
                    "id": item.get('review_id'),
                    "restaurantId": restaurant_id,
                    "restaurantName": restaurant_name,
                    "content": item.get('content', ''),
                    "rating": item.get('rating'),
                    "images": [item.get('image_url')] if item.get('image_url') else [],
                    "createdAt": created_at_str,
                    "updatedAt": updated_at_str
                }
                reviews.append(review_data)
        # 페이지네이션 정보
        pagination = {
            "page": page,
            "limit": limit,
            "total": total_count,
            "totalPages": total_pages,
            "hasNext": page < total_pages,
            "hasPrev": page > 1
        }

        return jsonify({
            "success": True,
            "data": {
                "reviews": reviews,
                "pagination": pagination
            }
        }), 200
    
    except Exception as e:
        logger.error(f"리뷰 목록 조회 중 오류 발생: {type(e).__name__}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        }), 500

#가게의 리뷰 목록을 조회
@reviews_bp.route('/restaurants/<restaurant_id>/reviews', methods=['GET'])
def get_restaurant_reviews(restaurant_id):
    """식당의 리뷰 목록 조회"""    
    try:
        # restaurant_id 검증
        try:
            restaurant_id_int = int(restaurant_id)
        except (ValueError, TypeError):
            logger.error(f"잘못된 restaurant_id 형식: {restaurant_id}")
            return jsonify({
                "success": False,
                "error": "잘못된 식당 ID입니다."
            }), 400
        
        # 식당 존재 확인
        if not check_restaurant_exists(restaurant_id_int):
            return jsonify({
                "success": False,
                "error": "존재하지 않는 식당입니다."
            }), 404
        
        # 쿼리 파라미터에서 페이지네이션 정보 가져오기
        page = request.args.get('page', default=1, type=int)
        limit = request.args.get('limit', default=20, type=int)
        
        # 페이지네이션 검증
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:  # 최대 100개로 제한
            limit = 20
        
        # 오프셋 계산
        offset = (page - 1) * limit
        
        # 리뷰 목록 조회
        result = supabase.table('reviews') \
            .select('review_id, user_id, content, rating, image_url, created_at, updated_at') \
            .eq('restaurant_id', restaurant_id_int) \
            .order('created_at', desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
        
        # 전체 개수 조회 (페이지네이션용)
        try:
            count_result = supabase.table('reviews') \
                .select('review_id', count='exact') \
                .eq('restaurant_id', restaurant_id_int) \
                .execute()
            
            # Supabase count 응답 처리
            if hasattr(count_result, 'count') and count_result.count is not None:
                total_count = count_result.count
            else:
                total_count = len(result.data) if result.data else 0
        except Exception as e:
            total_count = len(result.data) if result.data else 0

        total_pages = (total_count + limit - 1) // limit if limit > 0 else 1

        
        # 응답 형식 변환
        reviews = []
        if result.data:
            for item in result.data:

                user_id = item.get('user_id')

                result = supabase.table('users') \
                .select('nickname, profile_image_url') \
                .eq('user_id', user_id) \
                .execute()

                user=result.data[0] if result.data else {}

                review_data = {
                    "id": item.get('review_id'),
                    "content": item.get('content', ''),
                    "rating": item.get('rating'),
                    "createdAt": item.get('created_at'),
                    "updatedAt": item.get('updated_at'),
                    "userName" : user.get('nickname') or "익명",
                    "userProfileImage": user.get('profile_image_url') or "",
                    "images": item.get('image_url') or ''
                }
                reviews.append(review_data)

        # 페이지네이션 정보
        pagination = {
            "page": page,
            "limit": limit,
            "total": total_count,
            "totalPages": total_pages,
            "hasNext": page < total_pages,
            "hasPrev": page > 1
        }

        return jsonify({
            "success": True,
            "data": {
                "reviews": reviews,
                "pagination": pagination
            }
        }), 200
    except Exception as e:
        logger.error(f"리뷰 목록 조회 중 오류 발생: {type(e).__name__}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        }), 500




@reviews_bp.route('/restaurants/<restaurant_id>/reviews', methods=['POST'])
@login_required
def create_review(restaurant_id, user_id):
    """리뷰 작성"""
    try:
        try:
            restaurant_id_int = int(restaurant_id)
        except (ValueError, TypeError):
            logger.error(f"잘못된 restaurant_id 형식: {restaurant_id}")
            return jsonify({
                "success": False,
                "error": "잘못된 식당 ID입니다."
            }), 400
        
        # 식당 존재 확인
        if not check_restaurant_exists(restaurant_id_int):
            return jsonify({
                "success": False,
                "error": "존재하지 않는 식당입니다."
            }), 404
        
        # 요청 데이터 검증
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "요청 데이터가 없습니다."
            }), 400
        
        # 입력 값 추출 및 sanitization
        title = sanitize_input(data.get('title'), max_length=100) if data.get('title') else None
        content = sanitize_input(data.get('content'), max_length=2000) if data.get('content') else None
        rating = data.get('rating')
        image_data = data.get('image')  # Base64 또는 URL
        
        # 이미지 처리: Base64인 경우 Storage에 업로드, URL인 경우 그대로 사용
        image_url = None
        if image_data:
            if isinstance(image_data, str):
                # Base64 이미지인 경우 Storage에 업로드
                if image_data.startswith('data:image/'):
                    # Base64 검증
                    is_valid, error_msg = validate_base64_image(image_data)
                    if not is_valid:
                        return jsonify({
                            "success": False,
                            "error": error_msg
                        }), 400
                    
                    # Storage에 업로드
                    image_url = upload_image_to_storage(image_data, user_id)
                    if not image_url:
                        logger.error("이미지 업로드 실패")
                        return jsonify({
                            "success": False,
                            "error": "이미지 업로드에 실패했습니다. 다시 시도해주세요."
                        }), 500
                # URL인 경우 검증 후 사용
                elif image_data.startswith(('http://', 'https://')):
                    is_valid, error_msg = validate_image_url(image_data)
                    if is_valid:
                        image_url = image_data
                    else:
                        logger.warning(f"이미지 URL 검증 실패: {error_msg}")
                        return jsonify({
                            "success": False,
                            "error": error_msg
                        }), 400
                else:
                    logger.warning(f"잘못된 이미지 형식: {image_data[:50]}...")
                    return jsonify({
                        "success": False,
                        "error": "올바른 이미지 형식이 아닙니다."
                    }), 400
        
        # 필수 필드 검증
        if not title:
            return jsonify({
                "success": False,
                "error": "제목은 필수 항목입니다."
            }), 400
        
        if not content:
            return jsonify({
                "success": False,
                "error": "내용은 필수 항목입니다."
            }), 400
        
        if rating is None:
            return jsonify({
                "success": False,
                "error": "평점은 필수 항목입니다."
            }), 400
        
        # 입력 검증
        is_valid, error_msg = validate_review_title(title)
        if not is_valid:
            return jsonify({
                "success": False,
                "error": error_msg
            }), 400
        
        is_valid, error_msg = validate_review_content(content)
        if not is_valid:
            return jsonify({
                "success": False,
                "error": error_msg
            }), 400
        
        if image_url:
            is_valid, error_msg = validate_image_url(image_url)
            if not is_valid:
                return jsonify({
                    "success": False,
                    "error": error_msg
                }), 400
        
        # 현재 시간
        now = datetime.now().isoformat()
        
        # 리뷰 데이터 준비 (userId는 세션에서 가져옴, 클라이언트에서 보낸 값 무시)
        review_data = {
            'user_id': user_id,  # 세션에서 가져온 값만 사용
            'restaurant_id': restaurant_id_int,  # URL 파라미터에서 가져온 값만 사용
            'content': content,
            'rating': int(rating),
            'created_at': now,
            'updated_at': now
        }
        
        # 제목이 DB에 있는 경우 (없으면 content를 title로 사용)
        # DB 스키마에 title 필드가 있다면 추가
        # review_data['title'] = title
        
        # 이미지 URL 추가 (있는 경우)
        if image_url:
            review_data['image_url'] = image_url
        
        # 리뷰 삽입
        result = supabase.table('reviews').insert(review_data).execute()
        
        if not result.data:
            logger.error(f"리뷰 작성 실패: User ID={user_id}, Restaurant ID={restaurant_id_int}")
            return jsonify({
                "success": False,
                "error": "리뷰 작성에 실패했습니다."
            }), 500
        
        review = result.data[0]
        
        # 응답 형식 (요청한 바디 형식에 맞춤)
        response_data = {
            "reviewId": review.get('review_id'),
            "storeId": review.get('restaurant_id'),
            "userId": review.get('user_id'),
            "title": title,  # 요청에서 받은 title
            "content": review.get('content'),
            "image": review.get('image_url') or '',
            "rating": review.get('rating'),
            "createdAt": review.get('created_at'),
            "updatedAt": review.get('updated_at')
        }
        
        return jsonify({
            "success": True,
            "message": "리뷰가 작성되었습니다.",
            "data": response_data
        }), 201
    
    except ValueError as e:
        logger.warning(f"리뷰 작성 요청 오류: {str(e)}")
        return jsonify({
            "success": False,
            "error": "요청 데이터 형식이 올바르지 않습니다."
        }), 400
    except Exception as e:
        logger.error(f"리뷰 작성 중 오류 발생: {type(e).__name__}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        }), 500


@reviews_bp.route('/reviews/<review_id>', methods=['PUT'])
@login_required
def update_review(review_id, user_id):
    """리뷰 수정"""
    # HTTP 메서드 명시적 검증 (보안 강화)
    if request.method != 'PUT':
        logger.warning(f"허용되지 않은 HTTP 메서드: {request.method}, Review ID={review_id}, User ID={user_id}")
        return jsonify({
            "success": False,
            "error": "허용되지 않은 요청 메서드입니다."
        }), 405
    
    try:
        # review_id 검증
        try:
            review_id_int = int(review_id)
        except (ValueError, TypeError):
            logger.error(f"잘못된 review_id 형식: {review_id}")
            return jsonify({
                "success": False,
                "error": "잘못된 리뷰 ID입니다."
            }), 400
        
        # IDOR 방지: 리뷰 소유권 확인 (본인의 리뷰만 수정 가능)
        ownership_valid, restaurant_id = check_review_ownership(review_id_int, user_id)
        if not ownership_valid:
            logger.warning(f"리뷰 수정 권한 없음: Review ID={review_id_int}, User ID={user_id}")
            return jsonify({
                "success": False,
                "error": "본인의 리뷰만 수정할 수 있습니다."
            }), 403
        
        # 요청 데이터 검증
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "요청 데이터가 없습니다."
            }), 400
        
        # IDOR 방지: 클라이언트에서 보낸 userId, storeId, reviewId 무시 및 검증
        if 'userId' in data or 'storeId' in data or 'reviewId' in data:
            logger.warning(f"클라이언트에서 userId/storeId/reviewId 전송 시도: Review ID={review_id_int}, User ID={user_id}, Data={data.get('userId')}, {data.get('storeId')}, {data.get('reviewId')}")
            # 클라이언트에서 보낸 storeId와 실제 리뷰의 restaurant_id 비교
            if 'storeId' in data and restaurant_id:
                try:
                    client_store_id_int = int(data.get('storeId')) if data.get('storeId') else None
                    if client_store_id_int and client_store_id_int != restaurant_id:
                        logger.warning(f"리뷰 수정 시 storeId 불일치: Review ID={review_id_int}, 실제={restaurant_id}, 클라이언트={client_store_id_int}")
                except (ValueError, TypeError):
                    pass
            # 경고만 로깅하고 무시 (보안상 안전)
        
        # 업데이트할 필드 추출
        update_fields = {}
        
        # 제목 검증 및 추가
        if 'title' in data:
            title = sanitize_input(data.get('title'), max_length=100) if data.get('title') else None
            if title is not None:
                is_valid, error_msg = validate_review_title(title)
                if not is_valid:
                    return jsonify({
                        "success": False,
                        "error": error_msg
                    }), 400
                # DB에 title 필드가 있다면 추가
                # update_fields['title'] = title
        
        # 내용 검증 및 추가
        if 'content' in data:
            content = sanitize_input(data.get('content'), max_length=2000) if data.get('content') else None
            if content is not None:
                is_valid, error_msg = validate_review_content(content)
                if not is_valid:
                    return jsonify({
                        "success": False,
                        "error": error_msg
                    }), 400
                update_fields['content'] = content
        
        # 평점 검증 및 추가
        if 'rating' in data:
            rating = data.get('rating')
            if rating is not None:
                if not isinstance(rating, int) or rating < 1 or rating > 5:
                    return jsonify({
                        "success": False,
                        "error": "평점은 1에서 5 사이의 정수여야 합니다."
                    }), 400
                update_fields['rating'] = int(rating)
        
        # 이미지 URL 검증 및 추가
        if 'image' in data:
            image_url = sanitize_input(data.get('image'), max_length=2048) if data.get('image') else None
            if image_url is not None:
                is_valid, error_msg = validate_image_url(image_url)
                if not is_valid:
                    return jsonify({
                        "success": False,
                        "error": error_msg
                    }), 400
                update_fields['image_url'] = image_url if image_url else None
        
        # 업데이트할 필드가 없으면 에러
        if not update_fields:
            return jsonify({
                "success": False,
                "error": "수정할 필드를 입력해주세요."
            }), 400
        
        # updated_at 필드 추가
        update_fields['updated_at'] = datetime.now().isoformat()
        
        # 리뷰 업데이트 (IDOR 방지: user_id 조건 추가로 이중 검증)
        result = supabase.table('reviews') \
            .update(update_fields) \
            .eq('review_id', review_id_int) \
            .eq('user_id', user_id) \
            .execute()
        
        if not result.data:
            logger.error(f"리뷰 수정 실패: Review ID={review_id_int}, User ID={user_id}")
            return jsonify({
                "success": False,
                "error": "리뷰 수정에 실패했습니다."
            }), 500
        
        updated_review = result.data[0]
        
        # 응답 형식
        response_data = {
            "reviewId": updated_review.get('review_id'),
            "storeId": updated_review.get('restaurant_id'),
            "userId": updated_review.get('user_id'),
            "title": data.get('title', ''),  # 요청에서 받은 title 또는 빈 문자열
            "content": updated_review.get('content'),
            "image": updated_review.get('image_url') or '',
            "rating": updated_review.get('rating'),
            "createdAt": updated_review.get('created_at'),
            "updatedAt": updated_review.get('updated_at')
        }
        
        
        return jsonify({
            "success": True,
            "message": "리뷰가 수정되었습니다.",
            "data": response_data
        }), 200
    
    except ValueError as e:
        logger.warning(f"리뷰 수정 요청 오류: {str(e)}")
        return jsonify({
            "success": False,
            "error": "요청 데이터 형식이 올바르지 않습니다."
        }), 400
    except Exception as e:
        logger.error(f"리뷰 수정 중 오류 발생: {type(e).__name__}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        }), 500


@reviews_bp.route('/reviews/<review_id>', methods=['DELETE'])
@login_required
def delete_review(review_id, user_id):
    """리뷰 삭제"""
    # HTTP 메서드 명시적 검증 (보안 강화)
    if request.method != 'DELETE':
        logger.warning(f"허용되지 않은 HTTP 메서드: {request.method}, Review ID={review_id}, User ID={user_id}")
        return jsonify({
            "success": False,
            "error": "허용되지 않은 요청 메서드입니다."
        }), 405
    
    try:
        # review_id 검증
        try:
            review_id_int = int(review_id)
        except (ValueError, TypeError):
            logger.error(f"잘못된 review_id 형식: {review_id}")
            return jsonify({
                "success": False,
                "error": "잘못된 리뷰 ID입니다."
            }), 400
        
        # IDOR 방지: 리뷰 소유권 확인 (본인의 리뷰만 삭제 가능)
        ownership_valid, restaurant_id = check_review_ownership(review_id_int, user_id)
        if not ownership_valid:
            logger.warning(f"리뷰 삭제 권한 없음: Review ID={review_id_int}, User ID={user_id}")
            return jsonify({
                "success": False,
                "error": "본인의 리뷰만 삭제할 수 있습니다."
            }), 403
        
        # 리뷰 삭제 (IDOR 방지: user_id 조건 추가로 이중 검증)
        result = supabase.table('reviews') \
            .delete() \
            .eq('review_id', review_id_int) \
            .eq('user_id', user_id) \
            .execute()
        
        if not result.data:
            logger.warning(f"리뷰 삭제 실패: Review ID={review_id_int}, User ID={user_id} (리뷰를 찾을 수 없음)")
            return jsonify({
                "success": False,
                "error": "리뷰를 찾을 수 없습니다."
            }), 404
        
        return jsonify({
            "success": True,
            "message": "리뷰가 삭제되었습니다."
        }), 200
    
    except Exception as e:
        logger.error(f"리뷰 삭제 중 오류 발생: {type(e).__name__}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        }), 500

