from flask import request, jsonify
from datetime import datetime
import bcrypt
import logging
from app.config import supabase
from app.auth.validators import (
    validate_email,
    validate_password,
    validate_password_confirm,
    validate_nickname,
    validate_bio,
    validate_profile_image_url,
    check_email_exists,
    sanitize_input
)

# 로깅 설정
logger = logging.getLogger(__name__)


def signup_user():
    """회원가입 처리 함수"""
    try:
        data = request.get_json()
        
        # 요청 데이터 검증
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400
        
        # 입력 값 추출 및 sanitization
        email = sanitize_input(data.get('email'), max_length=254) if data.get('email') else None
        password = data.get('password')
        password_confirm = data.get('password_confirm')
        nickname = sanitize_input(data.get('nickname'), max_length=50) if data.get('nickname') else None
        
        # 필수 필드 검증
        if not email or not password or not password_confirm or not nickname:
            return jsonify({'error': '이메일, 비밀번호, 비밀번호 확인, 닉네임은 필수 항목입니다.'}), 400
        
        # 이메일 형식 검증
        is_valid, error_msg = validate_email(email)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # 비밀번호 검증
        is_valid, error_msg = validate_password(password)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # 비밀번호 확인 검증
        is_valid, error_msg = validate_password_confirm(password, password_confirm)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # 닉네임 검증
        is_valid, error_msg = validate_nickname(nickname)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # 이메일 중복 확인 (소문자로 변환하여 일관성 유지)
        email_lower = email.lower().strip()
        if check_email_exists(email_lower):
            return jsonify({'error': '이미 사용 중인 이메일입니다.'}), 409
        
        # 선택적 필드 검증 및 sanitization
        profile_image_url = sanitize_input(data.get('profile_image_url'), max_length=2048) if data.get('profile_image_url') else None
        bio = sanitize_input(data.get('bio'), max_length=500) if data.get('bio') else None
        
        # 프로필 이미지 URL 검증
        if profile_image_url:
            is_valid, error_msg = validate_profile_image_url(profile_image_url)
            if not is_valid:
                return jsonify({'error': error_msg}), 400
        
        # 소개 검증
        is_valid, error_msg = validate_bio(bio)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # 비밀번호 해싱 (bcrypt 사용, 라운드 수는 기본값 사용)
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # 현재 시간
        now = datetime.now().isoformat()
        
        # 사용자 데이터 준비 (이메일은 소문자로 저장)
        user_data = {
            'email': email_lower,
            'password_hash': password_hash,
            'nickname': nickname,
            'oauth_provider': 'self',
            'oauth_id': None,
            'created_at': now,
            'updated_at': now
        }
        
        # 선택적 필드 추가
        if profile_image_url:
            user_data['profile_image_url'] = profile_image_url
        if bio:
            user_data['bio'] = bio
        
        # Supabase에 사용자 데이터 삽입
        result = supabase.table('users').insert(user_data).execute()
        
        if result.data:
            # 비밀번호 해시는 응답에서 제외
            user_response = result.data[0].copy()
            user_response.pop('password_hash', None)
            
            # 로깅 (민감한 정보 제외)
            logger.info(f'새로운 사용자 회원가입 완료: {email_lower}')
            
            return jsonify({
                'message': '회원가입이 완료되었습니다.',
                'user': user_response
            }), 201
        else:
            logger.error('회원가입 실패: 데이터베이스 삽입 실패')
            return jsonify({'error': '회원가입에 실패했습니다.'}), 500
            
    except ValueError as e:
        # JSON 파싱 오류 등
        logger.warning(f'회원가입 요청 오류: {str(e)}')
        return jsonify({'error': '요청 데이터 형식이 올바르지 않습니다.'}), 400
    except Exception as e:
        # 기타 예외 처리 (에러 메시지 노출 방지)
        logger.error(f'회원가입 처리 중 오류 발생: {type(e).__name__}', exc_info=True)
        return jsonify({'error': '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}), 500

