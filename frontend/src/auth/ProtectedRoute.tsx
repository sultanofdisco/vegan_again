import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '../stores/useUserStore';

const ProtectedRoute = () => {
  const { user } = useUserStore();

  // 로그인 안 됨
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 로그인 됨
  return <Outlet />;
};

export default ProtectedRoute;