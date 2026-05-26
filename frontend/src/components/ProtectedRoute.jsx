import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import { LoadingState } from './ui';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState message="Проверка авторизации…" fullScreen />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
