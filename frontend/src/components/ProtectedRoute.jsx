import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

function ProtectedRoute() {
  const { token } = useAuth();

  if (!token) {
    // Se não há token, redireciona para a página de login
    return <Navigate to="/login" replace />;
  }

  // Se há token, renderiza o conteúdo da rota (ex: AdminLayout)
  return <Outlet />;
}

export default ProtectedRoute;