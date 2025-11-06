import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';
import apiClient from '../../lib/axios';

const LoginPage = () => {
  // State 선언
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const navigate = useNavigate();

  // 이메일 형식 검증 함수
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 에러 메시지 처리
  const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      return axiosError.response?.data?.error || '요청 처리 중 오류가 발생했습니다.';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return '알 수 없는 오류가 발생했습니다.';
  };

  // 로그인 핸들러
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // 이메일 형식 검증
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
        // 로그인 성공 - 사용자 정보 저장 (필요시 스토어에 저장)
        navigate('/');
      }
      
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // 회원가입 핸들러
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 이메일 형식 검증
    if (!validateEmail(email)) {
      setError('올바른 이메일 형식이 아닙니다.');
      return;
    }

    // 비밀번호 길이 검증 (백엔드 요구사항: 최소 8자)
    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/signup', {
        email,
        password,
        password_confirm: password, // 비밀번호 확인 (간단히 동일하게 설정)
        nickname: email.split('@')[0], // 기본 닉네임 (이메일 앞부분)
      });

      if (response.data.user) {
        alert('회원가입 성공!');
        setMode('login');
      }
      
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // 소셜 로그인 핸들러 (현재 미구현 - OAuth 기능 제외)
  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    setError(`${provider} 로그인은 현재 준비 중입니다.`);
    setLoading(false);
  };

  // 렌더링
  return (
    <>
      {/* 간소화된 헤더 */}
      <header className={styles.simpleHeader}>
        <div className={styles.headerContainer}>
          <button 
            onClick={() => navigate('/')} 
            className={styles.logoButton}
          >
            🌱비건어게인
          </button>
          <button 
            onClick={() => navigate('/')} 
            className={styles.backButton}
          >
            ← 메인으로
          </button>
        </div>
      </header>

      <div className={styles.container}>
        <h2>{mode === 'login' ? '로그인' : '회원가입'}</h2>
        
        <form onSubmit={mode === 'login' ? handleLogin : handleSignUp}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          
          <button type="submit" disabled={loading}>
            {loading 
              ? (mode === 'login' ? '로그인 중...' : '가입 중...') 
              : (mode === 'login' ? '로그인' : '회원가입')
            }
          </button>
          
          <button 
            type="button" 
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            disabled={loading}
            className={styles.switchButton}
          >
            {mode === 'login' ? '회원가입하기' : '로그인하기'}
          </button>
        </form>

        {/* 구분선 */}
        <div className={styles.divider}>
          <span>또는</span>
        </div>

        {/* 소셜 로그인 버튼들 */}
        <div className={styles.socialButtons}>
          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            className={styles.googleButton}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 계속하기
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('kakao')}
            disabled={loading}
            className={styles.kakaoButton}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#000000" d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"/>
            </svg>
            카카오로 계속하기
          </button>
        </div>
        
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </>
  );
};

export default LoginPage;