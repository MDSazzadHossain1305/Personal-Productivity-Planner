import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8 text-center text-muted">Loading...</p>;
  // visitors who are not logged in see the public welcome page first
  return user ? <Outlet /> : <Navigate to="/welcome" replace />;
}
