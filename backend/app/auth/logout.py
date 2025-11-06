from flask import jsonify, session
import logging

logger = logging.getLogger(__name__)


def logout_user():
    """로그아웃 처리 함수"""
    try:
        # 세션에서 사용자 정보 확인
        if not session.get('logged_in'):
            return jsonify({'error': '로그인되어 있지 않습니다.'}), 401
        
        # 로깅 (민감한 정보 제외)
        user_email = session.get('email', 'unknown')
        logger.info(f'사용자 로그아웃: {user_email}')
        
        # 세션 삭제
        session.clear()
        
        return jsonify({
            'message': '로그아웃되었습니다.'
        }), 200
        
    except Exception as e:
        logger.error(f'로그아웃 처리 중 오류 발생: {type(e).__name__}', exc_info=True)
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

