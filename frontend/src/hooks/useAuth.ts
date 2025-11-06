import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/axios';
import { useUserStore } from '../stores/useUserStore';
import { getErrorMessage } from '../utils/errorHelpers';
import { validateEmail, validateNickname, validatePassword, validatePasswordConfirm } from '../utils/validation';

interface UseAuthReturn {
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, passwordConfirm: string, nickname: string) => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser } = useUserStore();

  const clearError = () => setError(null);

  const login = async (email: string, password: string) => {
    setError(null);

    // 이메일 검증
    if (!validateEmail(email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      if (response.data.user) {
        setUser(response.data.user);
        navigate('/');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    passwordConfirm: string,
    nickname: string
  ) => {
    setError(null);

    // 이메일 검증
    if (!validateEmail(email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    // 비밀번호 검증
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error!);
      return;
    }

    // 비밀번호 확인 검증
    const passwordConfirmValidation = validatePasswordConfirm(password, passwordConfirm);
    if (!passwordConfirmValidation.isValid) {
      setError(passwordConfirmValidation.error!);
      return;
    }

    // 닉네임 검증
    const nicknameValidation = validateNickname(nickname);
    if (!nicknameValidation.isValid) {
      setError(nicknameValidation.error!);
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/signup', {
        email,
        password,
        password_confirm: passwordConfirm,
        nickname: nickname.trim(),
      });

      if (response.data.user) {
        alert('회원가입 성공!');
        return; // 성공 시 부모 컴포넌트에서 모드 전환 처리
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    login,
    signUp,
    clearError,
  };
}