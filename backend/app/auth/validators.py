import re
import html
from app.config import supabase


def validate_string_type(value, field_name):
    """입력 값이 문자열 타입인지 검증"""
    if not isinstance(value, str):
        return False, f'{field_name}은 문자열이어야 합니다.'
    return True, None


def sanitize_input(value, max_length=None):
    """입력 값 sanitization (앞뒤 공백 제거, 길이 제한, HTML 이스케이프)"""
    if not isinstance(value, str):
        return None
    sanitized = value.strip()
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    return html.escape(sanitized)


def validate_email(email):
    """이메일 형식 검증"""
    if not email:
        return False, '이메일은 필수 항목입니다.'
    
    # 문자열 타입 검증
    if not isinstance(email, str):
        return False, '이메일은 문자열이어야 합니다.'
    
    # 길이 제한 (RFC 5321에 따르면 이메일은 최대 254자)
    if len(email) > 254:
        return False, '이메일은 최대 254자까지 입력 가능합니다.'
    
    # 이메일 형식 검증
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False, '올바른 이메일 형식이 아닙니다.'
    
    # 소문자로 변환하여 저장 (일관성 유지)
    email = email.lower().strip()
    
    return True, None


def validate_password(password):
    """비밀번호 강도 검증"""
    if not password:
        return False, '비밀번호는 필수 항목입니다.'
    
    # 문자열 타입 검증
    if not isinstance(password, str):
        return False, '비밀번호는 문자열이어야 합니다.'
    
    # 최소 길이 검증
    if len(password) < 8:
        return False, '비밀번호는 최소 8자 이상이어야 합니다.'
    
    # 최대 길이 제한 (DoS 공격 방지)
    if len(password) > 128:
        return False, '비밀번호는 최대 128자까지 입력 가능합니다.'
    
    # 비밀번호 강도 검증
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in password)
    
    # 최소 조건: 대소문자, 숫자 중 2가지 이상 조합
    strength_count = sum([has_upper, has_lower, has_digit, has_special])
    if strength_count < 2:
        return False, '비밀번호는 대소문자, 숫자, 특수문자 중 2가지 이상 조합이 필요합니다.'
    
    return True, None


def validate_password_confirm(password, password_confirm):
    """비밀번호 확인 검증"""
    if not password_confirm:
        return False, '비밀번호 확인은 필수 항목입니다.'
    
    # 문자열 타입 검증
    if not isinstance(password_confirm, str):
        return False, '비밀번호 확인은 문자열이어야 합니다.'
    
    # 비밀번호 일치 검증 (타이밍 공격 방지를 위해 상수 시간 비교)
    if not constant_time_compare(password, password_confirm):
        return False, '비밀번호가 일치하지 않습니다.'
    
    return True, None


def constant_time_compare(val1, val2):
    """타이밍 공격 방지를 위한 상수 시간 문자열 비교"""
    if len(val1) != len(val2):
        return False
    result = 0
    for x, y in zip(val1, val2):
        result |= ord(x) ^ ord(y)
    return result == 0


def validate_nickname(nickname):
    """닉네임 검증"""
    if not nickname:
        return False, '닉네임은 필수 항목입니다.'
    
    # 문자열 타입 검증
    if not isinstance(nickname, str):
        return False, '닉네임은 문자열이어야 합니다.'
    
    # 길이 검증
    nickname = nickname.strip()
    if len(nickname) < 1:
        return False, '닉네임은 필수 항목입니다.'
    
    if len(nickname) > 50:
        return False, '닉네임은 최대 50자까지 입력 가능합니다.'
    
    # 금지된 문자 검증 (XSS 방지)
    dangerous_chars = ['<', '>', '"', "'", '&', '\n', '\r']
    for char in dangerous_chars:
        if char in nickname:
            return False, f'닉네임에 사용할 수 없는 문자가 포함되어 있습니다.'
    
    return True, None


def validate_bio(bio):
    """소개 검증"""
    if bio is None:
        return True, None
    
    # 문자열 타입 검증
    if not isinstance(bio, str):
        return False, '소개는 문자열이어야 합니다.'
    
    if len(bio) > 500:
        return False, '소개는 최대 500자까지 입력 가능합니다.'
    
    return True, None


def validate_profile_image_url(url):
    """프로필 이미지 URL 검증"""
    if url is None:
        return True, None
    
    # 문자열 타입 검증
    if not isinstance(url, str):
        return False, '프로필 이미지 URL은 문자열이어야 합니다.'
    
    # 길이 제한
    if len(url) > 2048:
        return False, '프로필 이미지 URL은 최대 2048자까지 입력 가능합니다.'
    
    # URL 형식 검증
    url_pattern = r'^https?://[^\s/$.?#].[^\s]*$'
    if not re.match(url_pattern, url):
        return False, '올바른 URL 형식이 아닙니다.'
    
    # 안전한 프로토콜만 허용
    if not url.startswith(('http://', 'https://')):
        return False, '프로필 이미지 URL은 http 또는 https로 시작해야 합니다.'
    
    return True, None


def check_email_exists(email):
    """이메일 중복 확인 (타이밍 공격 방지를 위해 항상 DB 쿼리 실행)"""
    try:
        # 이메일을 소문자로 변환하여 일관성 유지
        email = email.lower().strip() if isinstance(email, str) else None
        if not email:
            return False
        
        existing_user = supabase.table('users').select('user_id').eq('email', email).execute()
        return bool(existing_user.data)
    except Exception:
        # 에러 발생 시 False 반환 (존재하지 않는 것으로 처리)
        return False

