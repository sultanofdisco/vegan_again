import ipaddress
import socket
from urllib.parse import urlparse
from click import Tuple
import requests
from flask import Blueprint, request, jsonify, session
from app.config import supabase
from app.auth.session import validate_session_security
from app.auth.validators import sanitize_input
from functools import wraps
from datetime import datetime
import logging
import re
import base64
import os
from werkzeug.utils import secure_filename

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
            logger.warning(f'세션 토큰 없음: User ID={user_id}')
            return jsonify({
                "success": False,
                "error": "세션이 유효하지 않습니다. 다시 로그인해주세요."
            }), 401
        
        kwargs['user_id'] = user_id
        return f(*args, **kwargs)
    
    return decorated_function


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


def validate_rating(rating):
    """평점 검증"""
    if rating is None:
        return False, '평점은 필수 항목입니다.'
    
    if not isinstance(rating, (int, float)):
        return False, '평점은 숫자여야 합니다.'
    
    rating_num = float(rating)
    if rating_num < 1 or rating_num > 5:
        return False, '평점은 1부터 5까지 입력 가능합니다.'
    
    return True, None

def validate_image_url(image_url: str) -> Tuple[bool, str]:
    """
    [최대 보안 강화]
    SSRF, DNS Rebinding, IPv6 우회 등 모든 공격 벡터 차단
    """
    
    ALLOWED_IMAGE_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
    ]
    MAX_FILE_SIZE = 5 * 1024 * 1024
    MAX_URL_LENGTH = 2048

    # 1. 기본 문자열 검증
    if not isinstance(image_url, str):
        return False, '이미지 URL은 문자열이어야 합니다.'
    
    if len(image_url) > MAX_URL_LENGTH:
        return False, f'이미지 URL은 최대 {MAX_URL_LENGTH}자까지 입력 가능합니다.'

    # 2. URL 파싱 및 스킴 검증
    try:
        parsed = urlparse(image_url)
        
        # 2-1. 스킴은 http/https만 허용
        if parsed.scheme not in ['http', 'https']:
            return False, 'http 또는 https 프로토콜만 허용됩니다.'
        
        # 2-2. 호스트네임 필수
        if not parsed.hostname:
            return False, '유효하지 않은 URL입니다 (호스트명 없음).'
        
        # 2-3. 인증 정보 차단 (http://user:pass@host 형태)
        if parsed.username or parsed.password or '@' in parsed.netloc:
            return False, 'URL에 인증 정보를 포함할 수 없습니다.'
        
        hostname = parsed.hostname
        
    except Exception as e:
        return False, f'URL 파싱 오류: {e}'

    # 3. DNS 조회 및 모든 IP 검증 (IPv4 + IPv6)
    try:
        # getaddrinfo: IPv4와 IPv6 모두 반환
        addr_info = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        
        if not addr_info:
            return False, 'DNS 조회 결과가 없습니다.'
        
        # 모든 IP 주소 검증 (하나라도 위험하면 차단)
        safe_ips = []
        for info in addr_info:
            ip_str = info[4][0]
            
            try:
                ip_obj = ipaddress.ip_address(ip_str)
                
                # 위험한 IP 범위 모두 차단
                if (ip_obj.is_private or 
                    ip_obj.is_loopback or 
                    ip_obj.is_link_local or
                    ip_obj.is_multicast or
                    ip_obj.is_reserved or
                    ip_obj.is_unspecified):
                    return False, f'내부망/예약된 IP 주소 차단: {ip_str}'
                
                # 추가: 특정 위험 IP 대역 수동 차단
                # 0.0.0.0/8, 169.254.0.0/16, 224.0.0.0/4 등
                if ip_obj.version == 4:
                    first_octet = int(str(ip_obj).split('.')[0])
                    if first_octet in [0, 10, 127, 169, 172, 192, 224, 240]:
                        if first_octet == 172:
                            # 172.16.0.0/12만 사설망
                            second_octet = int(str(ip_obj).split('.')[1])
                            if 16 <= second_octet <= 31:
                                return False, f'사설 IP 차단: {ip_str}'
                        elif first_octet != 192 or str(ip_obj).startswith('192.168.'):
                            return False, f'차단된 IP 대역: {ip_str}'
                
                safe_ips.append(ip_str)
                
            except ValueError:
                return False, f'유효하지 않은 IP 주소: {ip_str}'
        
        if not safe_ips:
            return False, '안전한 IP 주소가 없습니다.'
        
        # 첫 번째 안전한 IP 사용
        target_ip = safe_ips[0]
        
    except socket.gaierror:
        return False, '도메인 이름을 확인할 수 없습니다.'
    except Exception as e:
        return False, f'DNS 조회 오류: {e}'

    # 4. IP로 직접 요청 (DNS Rebinding 방지)
    try:
        # URL의 호스트를 IP로 변경
        ip_url = image_url.replace(f'//{hostname}', f'//{target_ip}', 1)
        
        # Host 헤더는 원래 호스트명 유지 (가상 호스팅 지원)
        headers = {
            'Host': hostname,
            'User-Agent': 'Mozilla/5.0 (compatible; ImageValidator/1.0)'
        }
        
        # 타임아웃: (연결, 읽기) 분리
        timeout = (3, 7)
        
        # 리다이렉트 차단 (리다이렉트 체인 공격 방지)
        with requests.get(
            ip_url, 
            headers=headers,
            timeout=timeout,
            allow_redirects=False,  # 리다이렉트 완전 차단
            stream=True,  # 스트리밍으로 일부만 다운로드
            verify=True  # SSL 인증서 검증
        ) as r:
            # 4-1. 리다이렉트 응답 차단
            if 300 <= r.status_code < 400:
                return False, '리다이렉트는 허용되지 않습니다.'
            
            # 4-2. HTTP 상태 코드 검증
            r.raise_for_status()
            
            # 4-3. Content-Type 검증
            content_type = r.headers.get('Content-Type', '').split(';')[0].strip()
            if content_type not in ALLOWED_IMAGE_MIME_TYPES:
                return False, f'지원하지 않는 형식: {content_type}'
            
            # 4-4. Content-Length 검증 (헤더 기준)
            content_length = r.headers.get('Content-Length')
            if content_length:
                try:
                    size = int(content_length)
                    if size > MAX_FILE_SIZE:
                        return False, f'파일 크기 초과: {size / 1024 / 1024:.2f}MB'
                except ValueError:
                    pass
            
            # 4-5. 실제 바이너리 검증 (매직 넘버)
            # 처음 12바이트만 다운로드
            first_bytes = b''
            for chunk in r.iter_content(chunk_size=12):
                first_bytes = chunk
                break
            
            if not first_bytes:
                return False, '이미지 데이터를 읽을 수 없습니다.'
            
            # 매직 넘버 검증
            is_valid_image = (
                first_bytes.startswith(b'\xff\xd8\xff') or        # JPEG
                first_bytes.startswith(b'\x89PNG\r\n\x1a\n') or   # PNG
                first_bytes.startswith(b'GIF87a') or              # GIF87a
                first_bytes.startswith(b'GIF89a') or              # GIF89a
                (first_bytes.startswith(b'RIFF') and b'WEBP' in first_bytes[:12])  # WEBP
            )
            
            if not is_valid_image:
                return False, '실제 이미지 파일이 아닙니다 (매직 넘버 불일치).'
        
        # 모든 검증 통과
        return True, None

    except requests.exceptions.Timeout:
        return False, '이미지 URL 응답 시간 초과'
    except requests.exceptions.SSLError:
        return False, 'SSL 인증서 검증 실패'
    except requests.exceptions.ConnectionError:
        return False, '서버에 연결할 수 없습니다.'
    except requests.exceptions.RequestException as e:
        return False, f'요청 실패: {str(e)[:100]}'
    except Exception as e:
        return False, f'알 수 없는 오류: {str(e)[:100]}'


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


def validate_uploaded_file(file):
    """업로드된 파일 검증 (multipart/form-data 파일 업로드용)"""
    if not file:
        return True, None  # 선택사항
    
    # 파일 이름 검증 (경로 탐색 공격 방지)
    filename = secure_filename(file.filename) if hasattr(file, 'filename') else None
    if not filename:
        return False, "파일 이름이 올바르지 않습니다."
    
    # 파일 이름 길이 제한
    if len(filename) > 255:
        return False, "파일 이름이 너무 깁니다."
    
    # 위험한 파일 확장자 차단
    dangerous_extensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.sh', '.php', '.asp', '.aspx', '.jsp']
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext in dangerous_extensions:
        return False, f"허용되지 않는 파일 형식입니다: {file_ext}"
    
    # 허용된 이미지 확장자만 허용
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    if file_ext not in allowed_extensions:
        return False, f"지원하지 않는 이미지 형식입니다. JPEG, PNG, GIF, WEBP만 허용됩니다."
    
    # 파일 크기 제한 (5MB)
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    if hasattr(file, 'content_length') and file.content_length:
        if file.content_length > MAX_FILE_SIZE:
            return False, "파일 크기는 5MB를 초과할 수 없습니다."
    
    # MIME 타입 검증
    if hasattr(file, 'content_type') and file.content_type:
        allowed_mime_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if file.content_type not in allowed_mime_types:
            return False, f"지원하지 않는 이미지 형식입니다: {file.content_type}"
    
    # 실제 파일 내용 읽기 (매직 넘버 검사)
    try:
        file.seek(0)  # 파일 포인터를 처음으로
        file_header = file.read(12)  # 처음 12바이트 읽기
        file.seek(0)  # 파일 포인터를 다시 처음으로
        
        # 매직 넘버 검사
        if file_ext in ['.jpg', '.jpeg']:
            if not file_header.startswith(b'\xff\xd8\xff'):
                return False, "JPEG 이미지의 매직 넘버가 올바르지 않습니다."
        elif file_ext == '.png':
            if not file_header.startswith(b'\x89\x50\x4e\x47\x0d\x0a\x1a\x0a'):
                return False, "PNG 이미지의 매직 넘버가 올바르지 않습니다."
        elif file_ext == '.gif':
            if not (file_header.startswith(b'GIF87a') or file_header.startswith(b'GIF89a')):
                return False, "GIF 이미지의 매직 넘버가 올바르지 않습니다."
        elif file_ext == '.webp':
            if not (file_header.startswith(b'RIFF') and b'WEBP' in file_header):
                return False, "WEBP 이미지의 매직 넘버가 올바르지 않습니다."
    except Exception as e:
        logger.error(f"파일 내용 검증 오류: {str(e)}", exc_info=True)
        return False, "파일을 읽을 수 없습니다."
    
    return True, None


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
        
        # Supabase Storage에 업로드
        logger.info(f"이미지 업로드 시작: User ID={user_id}, Path={path}")
        
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
            
            logger.info(f"이미지 업로드 성공: {path}")
            
            # Public URL 가져오기
            url_result = supabase.storage.from_('review_images').get_public_url(path)
            
            if url_result:
                public_url = url_result
                logger.info(f"이미지 Public URL: {public_url}")
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
    # HTTP 메서드 명시적 검증 (보안 강화)
    if request.method != 'GET':
        logger.warning(f"허용되지 않은 HTTP 메서드: {request.method}, User ID={user_id}")
        return jsonify({
            "success": False,
            "error": "허용되지 않은 요청 메서드입니다."
        }), 405
    
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
        
        # IDOR 방지: 본인의 리뷰만 조회 (user_id는 세션에서 가져온 값만 사용)
        # 쿼리 파라미터에서 user_id를 받지 않음 (보안)
        
        # 리뷰 목록 조회 (restaurants 정보는 별도로 조회)
        result = supabase.table('reviews') \
            .select('review_id, restaurant_id, content, rating, image_url, created_at, updated_at') \
            .eq('user_id', user_id) \
            .order('created_at', desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
        
        logger.info(f"리뷰 조회 결과: {len(result.data) if result.data else 0}개, User ID={user_id}")
        
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
            logger.warning(f"카운트 조회 오류: {str(e)}, 데이터 길이 사용")
            total_count = len(result.data) if result.data else 0
        
        total_pages = (total_count + limit - 1) // limit if limit > 0 else 1
        
        logger.info(f"전체 리뷰 개수: {total_count}, 현재 페이지: {page}, 총 페이지: {total_pages}")
        
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
                logger.warning(f"식당 정보 일괄 조회 실패: {str(e)}")
        
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
                
                # 로깅 (디버깅용)
                if created_at_str:
                    logger.debug(f"리뷰 {item.get('review_id')} - created_at: {created_at_str}")
                if updated_at_str:
                    logger.debug(f"리뷰 {item.get('review_id')} - updated_at: {updated_at_str}")
                
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
        
        logger.info(f"변환된 리뷰 개수: {len(reviews)}")
        
        # 페이지네이션 정보
        pagination = {
            "page": page,
            "limit": limit,
            "total": total_count,
            "totalPages": total_pages,
            "hasNext": page < total_pages,
            "hasPrev": page > 1
        }
        
        logger.info(f"리뷰 목록 조회 성공: User ID={user_id}, Page={page}, Limit={limit}, Total={total_count}")
        
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
    # HTTP 메서드 명시적 검증 (보안 강화)
    if request.method != 'POST':
        logger.warning(f"허용되지 않은 HTTP 메서드: {request.method}, User ID={user_id}")
        return jsonify({
            "success": False,
            "error": "허용되지 않은 요청 메서드입니다."
        }), 405
    
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
        
        # 요청 데이터 검증
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "요청 데이터가 없습니다."
            }), 400
        
        # IDOR 방지: 클라이언트에서 보낸 userId, storeId 무시 (세션과 URL에서만 가져옴)
        if 'userId' in data or 'storeId' in data:
            logger.warning(f"클라이언트에서 userId/storeId 전송 시도: User ID={user_id}, Data={data.get('userId')}, {data.get('storeId')}")
            # 경고만 로깅하고 무시 (보안상 안전)
        
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
                    logger.info(f"Base64 이미지 감지, Storage에 업로드 시작: User ID={user_id}")
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
        
        is_valid, error_msg = validate_rating(rating)
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
        
        logger.info(f"리뷰 작성 성공: Review ID={review.get('review_id')}, User ID={user_id}, Restaurant ID={restaurant_id_int}")
        
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
                is_valid, error_msg = validate_rating(rating)
                if not is_valid:
                    return jsonify({
                        "success": False,
                        "error": error_msg
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
        
        logger.info(f"리뷰 수정 성공: Review ID={review_id_int}, User ID={user_id}")
        
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
        
        logger.info(f"리뷰 삭제 성공: Review ID={review_id_int}, User ID={user_id}")
        
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

