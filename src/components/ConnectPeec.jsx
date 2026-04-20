import { useState } from 'react';
import { startPeecAuth } from '../services/peecAuth';

export default function ConnectPeec() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setLoading(true);
    setError('');
    try {
      await startPeecAuth();
      // This will redirect the browser — we won't reach here
    } catch (err) {
      setError(err.message || 'Failed to start auth flow');
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', width: '100vw', background: 'var(--color-bg-base)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        
        <h2>Connect Peec AI</h2>
        <p className="text-muted">
          Securely connect your Peec account via OAuth to grant BrandPulse access to the live AI Model Context Protocol (MCP). You'll be redirected to Peec to authorize, then brought back here.
        </p>

        {error && <div className="badge badge-red mt-2">{error}</div>}

        <button 
          onClick={handleConnect} 
          className="btn" 
          disabled={loading}
          style={{ marginTop: '1rem', padding: '1rem 2rem', fontSize: '1.1rem', width: '100%' }}
        >
          {loading ? 'Redirecting to Peec AI...' : 'Connect with Peec AI'}
        </button>

        <p className="text-sm text-muted mt-4">
          Uses OAuth 2.0 with PKCE — no passwords are shared with BrandPulse.
        </p>
      </div>
    </div>
  );
}
