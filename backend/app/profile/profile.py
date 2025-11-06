from flask import Blueprint, request, jsonify, session
from app.config import supabase
from app.auth.validators import validate_nickname, validate_bio, sanitize_input
from app.auth.session import validate_session_security
from functools import wraps
from datetime import datetime
import logging
import base64
import re

profile_bp = Blueprint('profile', __name__)
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
            logger.warning(f'세션 토큰 없음: User ID={user_id}')
            return jsonify({
                "success": False,
                "error": "세션이 유효하지 않습니다. 다시 로그인해주세요."
            }), 401
        
        kwargs['user_id'] = user_id
        return f(*args, **kwargs)
    
    return decorated_function


def validate_base64_image(base64_string):
    """Base64 이미지 검증"""
    if not base64_string:
        return True, None  # 선택사항이므로 None은 허용
    
    if not isinstance(base64_string, str):
        return False, '프로필 이미지는 문자열이어야 합니다.'
    
    # Base64 형식 검증 (data:image/...;base64,... 형식 또는 순수 base64)
    base64_pattern = r'^data:image/(jpeg|jpg|png|webp|gif);base64,'
    
    if base64_string.startswith('data:image/'):
        # data:image/...;base64, 형식
        if not re.match(base64_pattern, base64_string):
            return False, '지원하지 않는 이미지 형식입니다. (JPEG, PNG, WEBP, GIF만 지원)'
        # base64 데이터 추출
        base64_data = base64_string.split(',', 1)[1]
    else:
        # 순수 base64 문자열
        base64_data = base64_string
    
    # Base64 디코딩 시도
    try:
        image_data = base64.b64decode(base64_data, validate=True)
    except Exception:
        return False, '유효하지 않은 Base64 형식입니다.'
    
    # 이미지 크기 검증 (5MB 제한)
    max_size = 5 * 1024 * 1024  # 5MB
    if len(image_data) > max_size:
        return False, '이미지 크기는 5MB 이하여야 합니다.'
    
    # 최소 크기 검증 (빈 이미지 방지)
    min_size = 100  # 100 bytes
    if len(image_data) < min_size:
        return False, '이미지 파일이 너무 작습니다.'
    
    # 이미지 형식 검증 (매직 넘버 확인)
    if not image_data.startswith(b'\xff\xd8') and not image_data.startswith(b'\x89PNG') and \
       not image_data.startswith(b'RIFF') and not image_data.startswith(b'GIF'):
        # JPEG, PNG, WEBP, GIF 매직 넘버 확인
        return False, '유효하지 않은 이미지 파일입니다.'
    
    return True, None


def process_base64_image(base64_string, user_id):
    """
    Base64 이미지를 처리하여 URL 반환
    실제 구현에서는 Supabase Storage에 업로드하거나 외부 이미지 호스팅 서비스 사용
    여기서는 간단히 base64를 data URL로 반환 (실제 프로덕션에서는 Storage에 업로드 권장)
    """
    if not base64_string:
        return None
    
    # data:image/...;base64, 형식이면 그대로 사용
    if base64_string.startswith('data:image/'):
        return base64_string
    
    # 순수 base64면 data URL 형식으로 변환
    # 실제로는 이미지 형식을 확인해야 하지만, 여기서는 기본값으로 image/jpeg 사용
    return f'data:image/jpeg;base64,{base64_string}'


@profile_bp.route('/profile', methods=['GET'])
@login_required
def get_profile(user_id):
    """프로필 조회"""
    try:
        # DB에서 사용자 정보 조회
        result = supabase.table('users').select(
            'user_id, email, nickname, bio, profile_image_url, created_at'
        ).eq('user_id', user_id).execute()
        
        if not result.data:
            logger.warning(f'프로필 조회 실패: User ID={user_id} (DB에 없음)')
            session.clear()
            return jsonify({
                "success": False,
                "error": "사용자 정보를 찾을 수 없습니다."
            }), 404
        
        user = result.data[0]
        
        # 응답 형식에 맞게 변환
        profile_data = {
            "userId": user['user_id'],
            "email": user['email'],
            "nickname": user['nickname'],
            "bio": user.get('bio') or "",
            "profileImage": user.get('profile_image_url') or "",
            "createdAt": user.get('created_at', datetime.now().isoformat())
        }
        
        logger.info(f'프로필 조회 성공: User ID={user_id}')
        
        return jsonify({
            "success": True,
            "data": profile_data
        }), 200
        
    except Exception as e:
        logger.error(f'프로필 조회 오류: {type(e).__name__}', exc_info=True)
        return jsonify({
            "success": False,
            "error": "프로필 조회 중 오류가 발생했습니다."
        }), 500


@profile_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile(user_id):
    """프로필 수정"""
    try:
        data = request.get_json()
        
        # 요청 데이터 검증
        if not data:
            return jsonify({
                "success": False,
                "error": "요청 데이터가 없습니다."
            }), 400
        
        # 업데이트할 필드 추출
        update_fields = {}
        
        # 닉네임 검증 및 추가
        if 'nickname' in data:
            nickname = sanitize_input(data.get('nickname'), max_length=50) if data.get('nickname') else None
            if nickname:
                is_valid, error_msg = validate_nickname(nickname)
                if not is_valid:
                    return jsonify({
                        "success": False,
                        "error": error_msg
                    }), 400
                update_fields['nickname'] = nickname
            else:
                # 빈 문자열이면 None으로 처리 (선택사항이므로)
                update_fields['nickname'] = None
        
        # 소개 검증 및 추가
        if 'bio' in data:
            bio = sanitize_input(data.get('bio'), max_length=500) if data.get('bio') else None
            if bio is not None:
                is_valid, error_msg = validate_bio(bio)
                if not is_valid:
                    return jsonify({
                        "success": False,
                        "error": error_msg
                    }), 400
                update_fields['bio'] = bio if bio else None
            else:
                update_fields['bio'] = None
        
        # 프로필 이미지 검증 및 처리
        if 'profileImage' in data:
            profile_image = data.get('profileImage')
            if profile_image:
                # Base64 이미지 검증
                is_valid, error_msg = validate_base64_image(profile_image)
                if not is_valid:
                    return jsonify({
                        "success": False,
                        "error": error_msg
                    }), 400
                
                # Base64 이미지 처리 (실제로는 Storage에 업로드)
                processed_image_url = process_base64_image(profile_image, user_id)
                update_fields['profile_image_url'] = processed_image_url
            else:
                # 빈 문자열이면 None으로 처리
                update_fields['profile_image_url'] = None
        
        # 업데이트할 필드가 없으면 에러
        if not update_fields:
            return jsonify({
                "success": False,
                "error": "수정할 필드를 입력해주세요."
            }), 400
        
        # updated_at 필드 추가
        update_fields['updated_at'] = datetime.now().isoformat()
        
        # DB 업데이트
        result = supabase.table('users').update(update_fields).eq('user_id', user_id).execute()
        
        if not result.data:
            logger.error(f'프로필 수정 실패: User ID={user_id} (DB 업데이트 실패)')
            return jsonify({
                "success": False,
                "error": "프로필 수정에 실패했습니다."
            }), 500
        
        updated_user = result.data[0]
        
        # 세션 정보 업데이트 (닉네임 변경 시)
        if 'nickname' in update_fields:
            session['nickname'] = updated_user['nickname']
        
        # 응답 형식에 맞게 변환
        profile_data = {
            "userId": updated_user['user_id'],
            "email": updated_user['email'],
            "nickname": updated_user['nickname'],
            "bio": updated_user.get('bio') or "",
            "profileImage": updated_user.get('profile_image_url') or "",
            "createdAt": updated_user.get('created_at', datetime.now().isoformat())
        }
        
        logger.info(f'프로필 수정 성공: User ID={user_id}, 변경 필드: {list(update_fields.keys())}')
        
        return jsonify({
            "success": True,
            "data": profile_data,
            "message": "프로필이 수정되었습니다."
        }), 200
        
    except ValueError as e:
        logger.warning(f'프로필 수정 요청 오류: {str(e)}')
        return jsonify({
            "success": False,
            "error": "요청 데이터 형식이 올바르지 않습니다."
        }), 400
    except Exception as e:
        logger.error(f'프로필 수정 오류: {type(e).__name__}', exc_info=True)
        return jsonify({
            "success": False,
            "error": "프로필 수정 중 오류가 발생했습니다."
        }), 500

