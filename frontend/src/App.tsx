import { Route, Routes } from 'react-router-dom';

// 공통 레이아웃- 및 인증 라우트
import Layout from './components/common/Layout';
import ProtectedRoute from './auth/ProtectedRoute';

// 페이지 컴포넌트
import MainPage from './pages/MainPage/MainPage';
import LoginPage from './pages/LoginPage/LoginPage';
import MyPage from './pages/MyPage/MyPage';
import { useEffect } from 'react';
import { useUserStore } from './stores/useUserStore';
import { supabase } from './lib/supabase';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';

function App() {
  {/* 사용자 상태 관리 */}
  // Zustand 스토어에서 setUser와 setIsLoading 함수를 꺼내옴
  const { setUser, setIsLoading } = useUserStore();

  // 앱이 처음 켜질 때 딱 한 번 실행됨
  useEffect(() => {
    setIsLoading(true); // 일단 로딩 시작

    // (비동기) 현재 세션(로그인 상태) 정보 가져오기
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 세션이 있으면 user 정보, 없으면 null을 스토어에 저장
      setUser(session?.user ?? null);
      setIsLoading(false); // 로딩 끝
    };

    // 앱 로드 시 첫 세션 정보 가져오기 실행
    getSession();

    {/* 인증 상태 변화 감지 */}
    // 로그인/로그아웃할 때마다 자동으로 감지
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // 변경된 세션 정보(있으면 user, 없으면 null)를 스토어에 저장
        setUser(session?.user ?? null);
        setIsLoading(false); // 상태 변경 시에도 로딩 끝
      }
    );

		{/* 정리 함수 */}
    // 컴포넌트가 사라질 때 감지기 구독 해제 (메모리 누수 방지)
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [setUser, setIsLoading]);
  return (
    <Routes>
      {/* 공통 레이아웃(헤더 등)을 사용하는 페이지들 */}
      <Route element={<Layout />}>
        { /* 누구나 접근 가능한 페이지 (메인) */}
        <Route index element={<MainPage />} />

        {/* 로그인이 필요한 페이지 (마이페이지) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/mypage" element={<MyPage />} />
          {/* <Route path="/settings" element={<SettingsPage />} /> */}
        </Route>
      </Route>

      {/* 레이아웃이 없는 단독 페이지 (로그인) */}
      <Route path="/login" element={<LoginPage />} />

      {/* 404 Not Found (모든 경로와 일치하지 않을 때) */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;