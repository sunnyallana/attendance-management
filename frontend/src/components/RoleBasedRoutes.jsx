import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/sign-in" state={{ from: location }} replace />;

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <Outlet />;
};