import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading session…</p>
      </div>
    );
  }

  if (!user?.authenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
