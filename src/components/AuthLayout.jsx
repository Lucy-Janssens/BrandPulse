import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function AuthLayout() {
  const { login, register } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const action = isLogin ? login : register;
    const result = await action(email, password);
    
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', width: '100vw', background: 'var(--color-bg-base)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="flex-col items-center justify-center gap-2" style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-primary)' }}></div>
          <h2 className="text-gradient" style={{ fontSize: '1.75rem', marginTop: '0.5rem' }}>BrandPulse AI</h2>
          <p className="text-muted text-sm">{isLogin ? 'Sign in to your command centre' : 'Create your account'}</p>
        </div>

        {error && <div className="badge badge-red" style={{ width: '100%', justifyContent: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="flex-col gap-4">
          <div className="flex-col gap-2">
            <label className="text-sm text-muted">Email address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-strong)',
                color: 'white', fontFamily: 'inherit', outline: 'none'
              }}
            />
          </div>
          <div className="flex-col gap-2">
            <label className="text-sm text-muted">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-strong)',
                color: 'white', fontFamily: 'inherit', outline: 'none'
              }}
            />
          </div>
          
          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '1rem', padding: '0.85rem' }}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <p className="text-center text-sm text-muted" style={{ textAlign: 'center', marginTop: '1rem' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span 
            onClick={() => setIsLogin(!isLogin)} 
            style={{ color: 'var(--color-primary)', cursor: 'pointer' }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </span>
        </p>
      </div>
    </div>
  );
}
