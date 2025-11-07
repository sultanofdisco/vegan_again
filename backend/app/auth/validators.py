import html
import re
from app.config import supabase


def validate_string_type(value, field_name):
    """입력 값이 문자열 타입인지 검증"""
    if not isinstance(value, str):
        return False, f'{field_name}은 문자열이어야 합니다.'
    return True, None


def sanitize_input(value, max_length=None):
    """입력 값 sanitization (앞뒤 공백 제거, 길이 제한)"""
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

def validate_review_title(title):
    """리뷰 제목 검증"""
    if not title:
        return False, '제목은 필수 항목입니다.'
    
    if not isinstance(title, str):
        return False, '제목은 문자열이어야 합니다.'
    
    title = title.strip()
    if len(title) < 1:
        return False, '제목은 필수 항목입니다.'
    
    if len(title) > 100:
        return False, '제목은 최대 100자까지 입력 가능합니다.'
    
    # XSS 방지: 위험한 문자 검증
    dangerous_chars = ['<', '>', '"', "'", '&']
    for char in dangerous_chars:
        if char in title:
            return False, '제목에 사용할 수 없는 문자가 포함되어 있습니다.'
    
    return True, None


def validate_review_content(content):
    """리뷰 내용 검증"""
    if not content:
        return False, '내용은 필수 항목입니다.'
    
    if not isinstance(content, str):
        return False, '내용은 문자열이어야 합니다.'
    
    content = content.strip()
    if len(content) < 1:
        return False, '내용은 필수 항목입니다.'
    
    if len(content) > 2000:
        return False, '내용은 최대 2000자까지 입력 가능합니다.'
    
    return True, None


def validate_image_url(image_url):
    """이미지 URL 검증"""
    if image_url is None or image_url == '':
        return True, None  # 선택사항
    
    if not isinstance(image_url, str):
        return False, '이미지 URL은 문자열이어야 합니다.'
    
    if len(image_url) > 2048:
        return False, '이미지 URL은 최대 2048자까지 입력 가능합니다.'
    
    # Base64 이미지인지 확인
    if image_url.startswith('data:image/'):
        return validate_base64_image(image_url)
    
    # URL 형식 검증
    url_pattern = r'^https?://[^\s/$.?#].[^\s]*$'
    if not re.match(url_pattern, image_url):
        return False, '올바른 URL 형식이 아닙니다.'
    
    # 안전한 프로토콜만 허용
    if not image_url.startswith(('http://', 'https://')):
        return False, '이미지 URL은 http 또는 https로 시작해야 합니다.'
    
    return True, None


def validate_base64_image(base64_string):
    """Base64 이미지 검증 (파일 업로드 취약점 방지)"""
    if not base64_string:
        return True, None  # 선택사항이므로 None은 허용
    
    if not isinstance(base64_string, str):
        return False, "이미지 데이터는 문자열이어야 합니다."

    # data URL 형식인지 확인 (예: data:image/png;base64,...)
    if not base64_string.startswith('data:image/'):
        return False, "올바른 Base64 이미지 데이터 형식이 아닙니다 (data URL 형식 필요)."

    # MIME 타입 추출
    mime_match = re.match(r'data:(image/[a-zA-Z0-9\-\.]+);base64,', base64_string)
    if not mime_match:
        return False, "올바른 Base64 이미지 데이터 형식이 아닙니다 (MIME 타입 오류)."
    
    mime_type = mime_match.group(1)
    allowed_mime_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if mime_type not in allowed_mime_types:
        return False, f"지원하지 않는 이미지 형식입니다: {mime_type}. JPEG, PNG, WEBP, GIF만 허용됩니다."

    # Base64 부분 추출 및 디코딩 시도
    try:
        base64_only = base64_string.split(',')[1]
        decoded_data = base64.b64decode(base64_only, validate=True)
    except Exception:
        return False, "유효하지 않은 Base64 인코딩입니다."

    # 파일 크기 제한 (5MB)
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    if len(decoded_data) > MAX_FILE_SIZE:
        return False, "이미지 크기는 5MB를 초과할 수 없습니다."
    
    # 매직 넘버 검사 (실제 파일 타입 확인 - 파일 확장자 스푸핑 방지)
    # JPEG: FF D8 FF
    # PNG: 89 50 4E 47 0D 0A 1A 0A
    # GIF: 47 49 46 38 37 61 or 47 49 46 38 39 61
    # WEBP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
    
    if mime_type == 'image/jpeg':
        if not decoded_data.startswith(b'\xff\xd8\xff'):
            return False, "JPEG 이미지의 매직 넘버가 올바르지 않습니다."
    elif mime_type == 'image/png':
        if not decoded_data.startswith(b'\x89\x50\x4e\x47\x0d\x0a\x1a\x0a'):
            return False, "PNG 이미지의 매직 넘버가 올바르지 않습니다."
    elif mime_type == 'image/gif':
        if not (decoded_data.startswith(b'GIF87a') or decoded_data.startswith(b'GIF89a')):
            return False, "GIF 이미지의 매직 넘버가 올바르지 않습니다."
    elif mime_type == 'image/webp':
        if not (decoded_data.startswith(b'RIFF') and b'WEBP' in decoded_data[:12]):
            return False, "WEBP 이미지의 매직 넘버가 올바르지 않습니다."

    return True, None
