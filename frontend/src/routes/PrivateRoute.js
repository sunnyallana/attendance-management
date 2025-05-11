import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ allowedRoles }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  
  return <Outlet />;
};

export default PrivateRoute;