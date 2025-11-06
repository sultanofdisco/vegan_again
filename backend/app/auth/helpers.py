from flask import session

def is_logged_in():
    """사용자가 로그인되어 있는지 확인하는 헬퍼 함수"""
    return session.get('logged_in', False)


def get_current_user_id():
    """현재 로그인한 사용자의 ID를 반환"""
    return session.get('user_id', None)


def get_current_user_email():
    """현재 로그인한 사용자의 이메일을 반환"""
    return session.get('email', None)

