import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LoginPage.module.css';
import { useAuth } from '../../hooks/useAuth';
import SocialLoginButtons from './components/SocialLoginButtons';

type AuthMode = 'login' | 'signup';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');
  
  const navigate = useNavigate();
  const { loading, error, login, signUp, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'login') {
      await login(email, password);
    } else {
      await signUp(email, password, passwordConfirm, nickname);
      // 회원가입 성공 시 로그인 모드로 전환
      if (!error) {
        switchMode('login');
      }
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    setPassword('');
    setPasswordConfirm('');
    setNickname('');
    if (newMode === 'login') {
      setEmail('');
    }
  };

  const handleSocialLogin = (provider: 'google' | 'kakao') => {
    alert(`${provider} 로그인은 현재 준비 중입니다.`);
  };

  return (
    <>
      {/* Header */}
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

      {/* Main Content */}
      <div className={styles.container}>
        <h2>{mode === 'login' ? '로그인' : '회원가입'}</h2>

        {/* Auth Form */}
        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="닉네임"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={loading}
              required
            />
          )}
          
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
          
          <input
            type="password"
            placeholder={mode === 'login' ? '비밀번호' : '비밀번호 (8자 이상)'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={mode === 'signup' ? 8 : undefined}
            disabled={loading}
            required
          />
          
          {mode === 'signup' && (
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              minLength={8}
              disabled={loading}
              required
            />
          )}

          <button type="submit" disabled={loading}>
            {loading
              ? (mode === 'login' ? '로그인 중...' : '가입 중...')
              : (mode === 'login' ? '로그인' : '회원가입')}
          </button>

          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            disabled={loading}
            className={styles.switchButton}
          >
            {mode === 'login' ? '회원가입하기' : '로그인하기'}
          </button>
        </form>

        {/* Divider */}
        <div className={styles.divider}>
          <span>또는</span>
        </div>

        {/* Social Login */}
        <SocialLoginButtons
          onGoogleLogin={() => handleSocialLogin('google')}
          onKakaoLogin={() => handleSocialLogin('kakao')}
          disabled={loading}
        />

        {/* Error Message */}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </>
  );
};

export default LoginPage;