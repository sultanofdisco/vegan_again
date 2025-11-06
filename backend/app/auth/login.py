from flask import request, jsonify, session
import bcrypt
import logging
import secrets
from datetime import datetime
from app.config import supabase
from app.auth.validators import sanitize_input

logger = logging.getLogger(__name__)


def login_user():
    """로그인 처리 함수"""
    try:
        data = request.get_json()
        
        # 요청 데이터 검증
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400
        
        email = sanitize_input(data.get('email'), max_length=254) if data.get('email') else None
        password = data.get('password')
        
        # 필수 필드 검증
        if not email or not password:
            return jsonify({'error': '이메일과 비밀번호는 필수 항목입니다.'}), 400
        
        # 이메일을 소문자로 변환하여 일관성 유지
        email_lower = email.lower().strip()
        
        # 사용자 정보 조회 (타이밍 공격 방지를 위해 항상 DB 쿼리 실행)
        try:
            result = supabase.table('users').select('user_id, email, password_hash, nickname, profile_image_url, bio, oauth_provider').eq('email', email_lower).execute()
        except Exception as e:
            logger.error(f'로그인 시 DB 조회 오류: {type(e).__name__}', exc_info=True)
            return jsonify({'error': '이메일 또는 비밀번호가 올바르지 않습니다.'}), 401
        
        # 사용자가 존재하지 않거나 비밀번호 해시가 없는 경우
        if not result.data or not result.data[0].get('password_hash'):
            return jsonify({'error': '이메일 또는 비밀번호가 올바르지 않습니다.'}), 401
        
        user = result.data[0]
        stored_password_hash = user['password_hash']
        
        # 비밀번호 검증
        try:
            password_match = bcrypt.checkpw(
                password.encode('utf-8'),
                stored_password_hash.encode('utf-8')
            )
        except Exception as e:
            logger.error(f'비밀번호 검증 오류: {type(e).__name__}', exc_info=True)
            return jsonify({'error': '이메일 또는 비밀번호가 올바르지 않습니다.'}), 401
        
        # 비밀번호가 일치하지 않는 경우
        if not password_match:
            return jsonify({'error': '이메일 또는 비밀번호가 올바르지 않습니다.'}), 401
        
        # 세션 고정 공격 방지: 기존 세션 삭제 후 새 세션 생성
        session.clear()
        
        # 로그인 성공 - 세션에 사용자 정보 저장
        session.permanent = True  # 영구 세션 활성화 (타임아웃 적용)
        session['user_id'] = user['user_id']
        session['email'] = user['email']
        session['nickname'] = user['nickname']
        session['logged_in'] = True
        session['login_time'] = datetime.now().isoformat()  # 로그인 시간 기록
        
        # 세션 하이재킹 방지: IP 주소 및 User-Agent 저장
        session['ip_address'] = request.remote_addr
        session['user_agent'] = request.headers.get('User-Agent', '')[:200]  # 길이 제한
        
        # 세션 토큰 생성 (추가 보안 레이어)
        session['session_token'] = secrets.token_urlsafe(32)
        
        # 비밀번호 해시는 응답에서 제외
        user_response = user.copy()
        user_response.pop('password_hash', None)
        
        # 로깅 (민감한 정보 제외)
        logger.info(f'사용자 로그인 성공: {email_lower}, IP: {request.remote_addr}')
        
        return jsonify({
            'message': '로그인에 성공했습니다.',
            'user': user_response
        }), 200
        
    except ValueError as e:
        logger.warning(f'로그인 요청 오류: {str(e)}')
        return jsonify({'error': '요청 데이터 형식이 올바르지 않습니다.'}), 400
    except Exception as e:
        logger.error(f'로그인 처리 중 오류 발생: {type(e).__name__}', exc_info=True)
        return jsonify({'error': '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}), 500
