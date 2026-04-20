import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Onboarding() {
  const { user, updateTeam } = useContext(AuthContext);
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('brandpulse_token');
      const res = await fetch('http://127.0.0.1:5050/api/team', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ companyName })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update auth context so the app recognizes the user now has a team
      updateTeam({ id: data.team._id, companyName: data.team.companyName });
    } catch (err) {
      setError(err.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', width: '100vw', background: 'var(--color-bg-base)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="flex-col gap-2">
          <h2 style={{ fontSize: '2rem' }}>Welcome aboard, {user?.email.split('@')[0]}!</h2>
          <p className="text-muted">Let's set up your team. What company are we tracking?</p>
          <p className="text-muted text-sm mt-2" style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--color-primary)' }}>
            This name serves as context for the Peec MCP API. The AI engines will be specifically queried for mentions regarding this brand.
          </p>
        </div>

        {error && <div className="badge badge-red">{error}</div>}

        <form onSubmit={handleCreateTeam} className="flex-col gap-4 mt-4">
          <div className="flex-col gap-2">
            <label className="text-sm text-muted">Company / Brand Name</label>
            <input 
              type="text" 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Stripe, Acme Corp, or BrandPulse"
              required
              style={{
                width: '100%', padding: '1rem', borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-strong)',
                color: 'white', fontFamily: 'inherit', outline: 'none',
                fontSize: '1.1rem'
              }}
            />
          </div>
          
          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}>
            {loading ? 'Configuring Team Context...' : 'Dive into Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
