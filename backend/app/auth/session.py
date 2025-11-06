from flask import jsonify, session, request
import logging
from app.config import supabase

logger = logging.getLogger(__name__)


def validate_session_security():
    """세션 보안 검증 (IP 주소 및 User-Agent 확인)"""
    # IP 주소 검증
    stored_ip = session.get('ip_address')
    current_ip = request.remote_addr
    
    if stored_ip and stored_ip != current_ip:
        logger.warning(f'세션 IP 불일치: 저장된 IP={stored_ip}, 현재 IP={current_ip}, User ID={session.get("user_id")}')
        # IP가 변경되었지만 완전히 차단하지 않음 (프록시/모바일 네트워크 변경 고려)
        # 필요시 더 엄격한 정책 적용 가능
    
    # User-Agent 검증
    stored_ua = session.get('user_agent')
    current_ua = request.headers.get('User-Agent', '')[:200]
    
    if stored_ua and stored_ua != current_ua:
        logger.warning(f'세션 User-Agent 불일치: User ID={session.get("user_id")}')
        # User-Agent 변경 시 세션 무효화 (보안 강화)
        session.clear()
        return False
    
    return True


def get_current_user():
    """현재 로그인한 사용자 정보 반환"""
    try:
        # 세션에서 로그인 상태 확인
        if not session.get('logged_in'):
            return jsonify({'error': '로그인되어 있지 않습니다.'}), 401
        
        # 세션 보안 검증
        if not validate_session_security():
            return jsonify({'error': '세션이 유효하지 않습니다. 다시 로그인해주세요.'}), 401
        
        user_id = session.get('user_id')
        email = session.get('email')
        nickname = session.get('nickname')
        
        if not user_id:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 401
        
        # 세션 토큰 확인 (추가 보안 레이어)
        session_token = session.get('session_token')
        if not session_token:
            logger.warning(f'세션 토큰 없음: User ID={user_id}')
            return jsonify({'error': '세션이 유효하지 않습니다. 다시 로그인해주세요.'}), 401
        
        # DB에서 최신 사용자 정보 가져오기 (선택사항)
        try:
            result = supabase.table('users').select('user_id, email, nickname, profile_image_url, bio, oauth_provider').eq('user_id', user_id).execute()
            if result.data:
                user = result.data[0]
            else:
                # 세션에는 있지만 DB에 없는 경우 (계정 삭제됨)
                logger.warning(f'DB에 사용자 없음: User ID={user_id}')
                session.clear()
                return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 401
        except Exception as e:
            logger.error(f'사용자 정보 조회 오류: {type(e).__name__}', exc_info=True)
            # DB 조회 실패 시 세션 정보 사용 (하지만 경고 로그)
            user = {
                'user_id': user_id,
                'email': email,
                'nickname': nickname,
                'profile_image_url': None,
                'bio': None,
                'oauth_provider': 'self'
            }
        
        return jsonify({
            'user': user
        }), 200
        
    except Exception as e:
        logger.error(f'세션 확인 중 오류 발생: {type(e).__name__}', exc_info=True)
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

