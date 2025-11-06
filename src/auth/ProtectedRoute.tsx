import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../stores/useUserStore';
import Spinner from '../components/common/Spinner'; // Spinner import

const ProtectedRoute = () => {
  const { user, isLoading } = useUserStore();

  // 로딩 중 (인증 상태 확인 중)
  if (isLoading) {
    return <Spinner />; 
  }

  // 로딩 완료 + 로그인 안 됨
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 로딩 완료 + 로그인 됨
  return <Outlet />;
};

export default ProtectedRoute;