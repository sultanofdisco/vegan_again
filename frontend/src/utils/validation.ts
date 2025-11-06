/**
 * 이메일 형식 검증
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 비밀번호 검증
 */
export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (password.length < 8) {
    return {
      isValid: false,
      error: '비밀번호는 최소 8자 이상이어야 합니다.',
    };
  }
  return { isValid: true };
}

/**
 * 비밀번호 확인 검증
 */
export function validatePasswordConfirm(password: string, passwordConfirm: string): {
  isValid: boolean;
  error?: string;
} {
  if (password !== passwordConfirm) {
    return {
      isValid: false,
      error: '비밀번호가 일치하지 않습니다.',
    };
  }
  return { isValid: true };
}

/**
 * 닉네임 검증
 */
export function validateNickname(nickname: string): {
  isValid: boolean;
  error?: string;
} {
  if (!nickname.trim()) {
    return {
      isValid: false,
      error: '닉네임을 입력해주세요.',
    };
  }
  return { isValid: true };
}