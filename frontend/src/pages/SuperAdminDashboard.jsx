import { useAuth } from '../contexts/AuthContext';

export default function SuperAdminDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Super Admin Dashboard</h1>
      <p>Welcome, {user?.email}</p>
      {/* Organization creation UI here */}
    </div>
  );
}