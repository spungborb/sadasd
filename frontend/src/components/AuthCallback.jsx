import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeSession } from '@/data/api';

export default function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(null);

  const processAuth = useCallback(async () => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const hash = window.location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) { navigate('/market', { replace: true }); return; }
    try {
      const user = await exchangeSession(match[1]);
      navigate('/market', { replace: true, state: { user } });
    } catch (err) {
      setError('Authentication failed. Please try again.');
      setTimeout(() => navigate('/', { replace: true }), 3000);
    }
  }, [navigate]);

  useEffect(() => { processAuth(); }, [processAuth]);

  if (error) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="text-center"><p className="text-red-400 text-sm">{error}</p><p className="text-zinc-500 text-xs mt-2">Redirecting...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-valorant border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-zinc-400 text-sm mt-4">Signing in...</p>
      </div>
    </div>
  );
}
