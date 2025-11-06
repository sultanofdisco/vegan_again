import { Route, Routes } from 'react-router-dom';

// 공통 레이아웃- 및 인증 라우트
import Layout from './components/common/Layout';
import ProtectedRoute from './auth/ProtectedRoute';

// 페이지 컴포넌트
import MainPage from './pages/MainPage/MainPage';
import LoginPage from './pages/LoginPage/LoginPage';
import MyPage from './pages/MyPage/MyPage';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';

function App() {
  // 초기 로드 시 세션 확인 제거 (보안상 더 안전)
  // 로그인/로그아웃 시에만 사용자 상태 관리

  return (
    <Routes>
      {/* 공통 레이아웃(헤더 등)을 사용하는 페이지들 */}
      <Route element={<Layout />}>
        {/* 누구나 접근 가능한 페이지 (메인) */}
        <Route index element={<MainPage />} />

        {/* 로그인이 필요한 페이지 (마이페이지) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/mypage" element={<MyPage />} />
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
