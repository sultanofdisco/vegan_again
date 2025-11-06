// Header.tsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../stores/useUserStore';
import { supabase } from '../../lib/supabase';
import styles from './Header.module.css';
import { useSearchStore } from '../../stores/useSearchStore';
import { useState, useRef } from 'react';

const Header = () => {
  const user = useUserStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const { searchText, setSearchText } = useSearchStore();
  
  const [inputValue, setInputValue] = useState(''); // 입력 중인 임시 검색어
  const [isSearching, setIsSearching] = useState(false); // 검색 중 상태
  const inputRef = useRef<HTMLInputElement>(null);

  const hideSearchBar = location.pathname === '/mypage';

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout Error:', error);
      alert('로그아웃 실패: ' + error.message);
    } else {
      navigate('/');
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.location.pathname === '/') {
      window.location.reload();
    } else {
      navigate('/');
    }
  };

  // Enter 키로 검색 실행
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      
      if (trimmed) {
        setSearchText(trimmed); // 실제 검색어 저장
        setIsSearching(true); // 검색 중 상태로 변경
        inputRef.current?.blur();
      }
    }
  };

  // 검색 초기화
  const handleClearSearch = () => {
    setSearchText('');
    setInputValue('');
    setIsSearching(false);
    inputRef.current?.focus();
  };

  // 검색 중일 때와 아닐 때 다른 UI
  const showSearchingState = isSearching && searchText;

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <h1 className={styles.logo}>
          <Link to="/" onClick={handleLogoClick}>🌱비건어게인</Link>
        </h1>
        
        {!hideSearchBar && (
          <div className={styles.searchSection}>
            <div className={`${styles.searchWrapper} ${showSearchingState ? styles.searching : ''}`}>
              <span className={styles.searchIcon}>🔍</span>
              
              {showSearchingState ? (
                // 검색 중 상태
                <>
                  <div className={styles.searchingDisplay}>
                    <span className={styles.searchTerm}>"{searchText}"</span>
                  </div>
                  <button
                    onClick={handleClearSearch}
                    className={styles.clearButton}
                    aria-label="검색 초기화"
                  >
                    ✕
                  </button>
                </>
              ) : (
                // 일반 상태
                <>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="식당명 또는 지역 검색"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className={styles.searchInput}
                  />
                  {inputValue && (
                    <button
                      onClick={() => setInputValue('')}
                      className={styles.clearButton}
                      aria-label="입력 지우기"
                    >
                      ✕
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>메인</Link>
          <Link to="/mypage" className={styles.navLink}>마이페이지</Link>
          
          {user ? (
            <button onClick={handleLogout} className={styles.logoutButton}>
              로그아웃
            </button>
          ) : (
            <Link to="/login" className={styles.loginButton}>
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;