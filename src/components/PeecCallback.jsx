import { useEffect, useState } from 'react';
import { handleOAuthCallback } from '../services/mcp';

export default function PeecCallback() {
  const [status, setStatus] = useState('Exchanging authorization code...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const exchange = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const errorParam = params.get('error');

      if (errorParam) {
        setError(`Authorization denied: ${errorParam}`);
        return;
      }

      if (!code) {
        setError('No authorization code received from Peec.');
        return;
      }

      try {
        setStatus('Exchanging code for access token...');
        await handleOAuthCallback(code);
        setStatus('✅ Connected! Redirecting to dashboard...');
        
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err.message);
      }
    };

    exchange();
  }, []);

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', width: '100vw', background: 'var(--color-bg-base)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
        {error ? (
          <>
            <div className="badge badge-red" style={{ padding: '0.5rem 1rem' }}>{error}</div>
            <button 
              className="btn mt-4" 
              onClick={() => window.location.href = '/'}
              style={{ padding: '0.75rem 2rem' }}
            >
              Back to Dashboard
            </button>
          </>
        ) : (
          <>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p className="text-muted">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}
