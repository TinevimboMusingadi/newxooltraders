import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      navigate(`/?error=${encodeURIComponent(error)}`, { replace: true });
      return;
    }
    navigate('/trade', { replace: true });
  }, [searchParams, navigate]);

  return (
    <div className="page-loading">
      <div className="spinner" />
      <p>Completing sign in…</p>
    </div>
  );
}
