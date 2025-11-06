import { Route, Routes } from 'react-router-dom';

import Layout from './components/common/Layout';
import ProtectedRoute from './auth/ProtectedRoute';

import MainPage from './pages/MainPage/MainPage';
import LoginPage from './pages/LoginPage/LoginPage';
import MyPage from './pages/MyPage/MyPage';
import { useEffect } from 'react';
import { useUserStore } from './stores/useUserStore';
import { supabase } from './lib/supabase';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';

function App() {
  const { setUser, setIsLoading } = useUserStore();

  useEffect(() => {
    setIsLoading(true); 

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      setUser(session?.user ?? null);
      setIsLoading(false); // 로딩 끝
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false); 
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [setUser, setIsLoading]);
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<MainPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/mypage" element={<MyPage />} />
        </Route>
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;