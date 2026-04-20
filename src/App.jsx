import { useState, useEffect, useContext } from 'react'
import ConnectPeec from './components/ConnectPeec'
import PeecCallback from './components/PeecCallback'
import { AuthContext } from './context/AuthContext'
import AuthLayout from './components/AuthLayout'
import Onboarding from './components/Onboarding'
import './index.css'
import { analyzeBrandWithAI } from './services/openrouter'
import { isMcpConnected } from './services/mcp'
import { mockVisibilityData, mockAlerts, mockCitationGaps, mockCompetitorData } from './store/mockData'

// Helper Component for KPI Cards
const KPICard = ({ title, value, subtext, trendText }) => (
  <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
    <h3 className="text-muted text-sm" style={{ marginBottom: '0.5rem' }}>{title}</h3>
    <div className="flex items-center gap-4">
      <span style={{ fontSize: '2.5rem', fontWeight: '700' }} className="text-gradient">{value || '-'}</span>
      {trendText && <span className="badge badge-green">{trendText}</span>}
    </div>
    <p className="text-muted text-sm mt-2">{subtext}</p>
  </div>
)

// --- MODULES ---

const OverviewDashboard = ({ liveData, error, loading }) => {
  if (loading) {
    return (
      <div className="flex-col justify-center items-center gap-4" style={{ width: '100%', height: '100%', minHeight: '300px' }}>
        <p className="text-muted">Fetching live representation from OpenRouter MCP...</p>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  // Fallback to mock data if no live data is available (e.g. key is missing)
  const data = liveData || { 
    visibilityData: mockVisibilityData, 
    alerts: mockAlerts, 
    citations: mockCitationGaps 
  };

  return (
    <div className="flex-col gap-6" style={{ width: '100%' }}>
      <header className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Overview Dashboard</h2>
          <p className="text-muted">Your daily pulse on AI search engine representation.</p>
        </div>
        
        {error ? (
          <div className="badge badge-red" style={{ padding: '0.5rem 1rem' }}>{error} - Using Fallback Context</div>
        ) : (
          <div className="badge badge-green" style={{ padding: '0.5rem 1rem' }}>
            <span style={{ marginRight: '0.5rem', width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span>
            Live API Context Connected
          </div>
        )}
      </header>

      <div className="flex gap-6" style={{ width: '100%' }}>
        <KPICard title="Overall Visibility Score" value={`${data.visibilityData.overallScore}/100`} trendText={data.visibilityData.trend} subtext="Across ChatGPT, Perplexity, Gemini & Claude" />
        <KPICard title="Average Sentiment" value={`${data.visibilityData.sentiment}%`} subtext="Positive or neutral mentions" />
        <KPICard title="Citation Gaps Identified" value={data.citations.length} subtext="Missed opportunities for traffic" />
      </div>

      <div className="flex gap-6" style={{ marginTop: '1rem' }}>
        <div className="glass-panel" style={{ flex: 2, padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Recent AI MCP Alerts</h3>
          <div className="flex-col gap-4">
            {data.alerts.map(alert => (
              <div key={alert.id} className="flex justify-between items-center" style={{ padding: '1rem', background: 'var(--color-bg-base)', borderRadius: '12px' }}>
                <div className="flex items-center gap-4">
                  <span className={alert.type === 'Drop' ? 'badge badge-red' : 'badge badge-green'}>{alert.type}</span>
                  <span>{alert.message}</span>
                </div>
                <span className="text-muted text-sm">{alert.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const VisibilityDeepDive = () => (
  <div className="flex-col gap-6" style={{ width: '100%' }}>
    <header style={{ marginBottom: '1rem' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Visibility Deep-Dive</h2>
      <p className="text-muted">Understand exactly which AI models favour your brand.</p>
    </header>
    
    <div className="flex gap-6 flex-wrap">
      {mockVisibilityData.modelBreakdown.map(model => (
        <div key={model.model} className="glass-panel" style={{ flex: '1 1 calc(50% - 1.5rem)', padding: '2rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem' }}>{model.model}</h3>
            <span className={model.score > 75 ? 'text-gradient font-bold' : 'text-muted'} style={{ fontSize: '1.5rem' }}>
              {model.score}/100
            </span>
          </div>
          <div style={{ background: 'var(--color-bg-base)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${model.score}%`, background: model.score > 75 ? 'var(--color-primary)' : 'var(--color-secondary)', height: '100%' }}></div>
          </div>
          <p className="text-sm mt-4 text-muted">Top Topic: <span style={{ color: 'white' }}>{model.topTopic}</span></p>
        </div>
      ))}
    </div>
  </div>
)

const CompetitorRadar = () => (
  <div className="flex-col gap-6" style={{ width: '100%' }}>
    <header style={{ marginBottom: '1rem' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Competitor Radar</h2>
      <p className="text-muted">Side-by-side share of voice across tracked brands.</p>
    </header>

    <div className="glass-panel" style={{ padding: '0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-strong)' }}>
            <th style={{ padding: '1.5rem', color: 'var(--color-text-muted)' }}>Rank</th>
            <th style={{ padding: '1.5rem', color: 'var(--color-text-muted)' }}>Brand Name</th>
            <th style={{ padding: '1.5rem', color: 'var(--color-text-muted)' }}>Share of Voice</th>
            <th style={{ padding: '1.5rem', color: 'var(--color-text-muted)' }}>Sentiment</th>
            <th style={{ padding: '1.5rem', color: 'var(--color-text-muted)' }}>Trend</th>
          </tr>
        </thead>
        <tbody>
          {mockCompetitorData.map(comp => (
            <tr key={comp.name} style={{ borderBottom: '1px solid var(--border-light)' }}>
              <td style={{ padding: '1.5rem', fontWeight: 'bold' }}>#{comp.rank}</td>
              <td style={{ padding: '1.5rem' }}>{comp.name}</td>
              <td style={{ padding: '1.5rem' }}>{comp.shareOfVoice}%</td>
              <td style={{ padding: '1.5rem' }}>
                <span className={comp.sentiment > 70 ? 'text-gradient' : ''}>{comp.sentiment}%</span>
              </td>
              <td style={{ padding: '1.5rem' }}>
                <span className={comp.trend === 'up' ? 'badge badge-green' : comp.trend === 'down' ? 'badge badge-red' : 'text-muted text-sm'}>
                  {comp.trend.toUpperCase()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const CitationGapAudit = () => (
  <div className="flex-col gap-6" style={{ width: '100%' }}>
    <header style={{ marginBottom: '1rem' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Citation Gap Audit</h2>
      <p className="text-muted">Win back traffic where you have visibility but no links.</p>
    </header>

    <div className="flex-col gap-4">
      {mockCitationGaps.map(gap => (
        <div key={gap.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="flex justify-between items-center">
            <h3>Query: "{gap.query}"</h3>
            <span className={gap.impact === 'High' ? 'badge badge-red' : 'badge badge-green'}>{gap.impact} Impact</span>
          </div>
          <p className="text-sm">Model: <span style={{ color: 'var(--color-primary)'}}>{gap.model}</span> | Cited Instead: <span>{gap.citedCompetitor}</span></p>
          <div style={{ background: 'rgba(99,102,241,0.1)', borderLeft: '4px solid var(--color-primary)', padding: '1rem', borderRadius: '0 8px 8px 0' }}>
            <p className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>AI-Generated Content Strategy:</p>
            <p>{gap.suggestedAction}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
)

const SourcesExplorer = () => (
  <div className="flex-col gap-6" style={{ width: '100%' }}>
    <header style={{ marginBottom: '1rem' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Sources Explorer</h2>
      <p className="text-muted">URLs the AI is actively citing about your industry.</p>
    </header>

    <div className="glass-panel flex items-center justify-center" style={{ height: '200px' }}>
      <p className="text-muted">Data populated via Peec MCP endpoints...</p>
    </div>
  </div>
)

// --- APP & LAYOUT ---

function DashboardLayout() {
  const [activeModule, setActiveModule] = useState('Overview Dashboard');
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, logout } = useContext(AuthContext);

  useEffect(() => {
    // Only attempt live fetch once we hit the overview page initially
    if (!user?.team?.companyName) return;
    
    // Add simple CSS spin animation dynamically
    const style = document.createElement('style');
    style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);

    const loadLiveData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await analyzeBrandWithAI(user.team.companyName);
        setLiveData(data);
      } catch (err) {
        setError(err.message || "Missing API Key");
        console.warn("Falling back to local mock data.", err);
      } finally {
        setLoading(false);
      }
    };

    loadLiveData();
  }, [user]);

  const modules = {
    'Overview Dashboard': <OverviewDashboard liveData={liveData} error={error} loading={loading} />,
    'Visibility Deep-Dive': <VisibilityDeepDive />,
    'Competitor Radar': <CompetitorRadar />,
    'Citation Gap Audit': <CitationGapAudit />,
    'Sources Explorer': <SourcesExplorer />
  }

  return (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="glass-panel sidebar" style={{ 
        width: '280px', 
        borderLeft: 'none',
        borderTop: 'none',
        borderBottom: 'none',
        borderRadius: '0 16px 16px 0',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-primary)' }}></div>
          <h1 className="text-gradient" style={{ fontSize: '1.5rem', letterSpacing: '-0.5px' }}>BrandPulse AI</h1>
        </div>
        
        <div className="flex-col gap-1" style={{ marginTop: '-1rem' }}>
          <span className="text-sm text-muted">Tracking Brand Context:</span>
          <span className="badge badge-green" style={{ alignSelf: 'flex-start' }}>{user?.team?.companyName}</span>
        </div>

        <nav className="flex-col gap-2" style={{ marginTop: '0.5rem', flex: 1 }}>
          {Object.keys(modules).map(name => (
            <button 
              key={name}
              className={`nav-btn ${activeModule === name ? 'active' : ''}`}
              onClick={() => setActiveModule(name)}
              style={{
                background: activeModule === name ? 'var(--color-bg-surface-hover)' : 'transparent',
                border: '1px solid',
                borderColor: activeModule === name ? 'var(--color-primary)' : 'transparent',
                color: activeModule === name ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                fontWeight: activeModule === name ? '500' : '400',
                transition: 'all 0.2s',
              }}
            >
              {name}
            </button>
          ))}
        </nav>
        
        <div className="flex items-center justify-between" style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
          <span className="text-sm text-muted truncate">{user?.email.split('@')[0]}</span>
          <button onClick={logout} className="text-sm" style={{ color: 'var(--color-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Exit</button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '3rem 4rem', display: 'flex', flexDirection: 'column' }}>
        {modules[activeModule]}
      </main>
    </div>
  )
}

function App() {
  const { user, loading } = useContext(AuthContext)

  // Handle /callback route for OAuth PKCE code exchange
  if (window.location.pathname === '/callback') {
    return <PeecCallback />
  }

  if (loading) return null;

  if (!user) return <AuthLayout />
  if (!user.team) return <Onboarding />
  
  // Check if user has a valid Peec OAuth token
  if (!isMcpConnected()) {
    return <ConnectPeec />
  }

  return <DashboardLayout />
}

export default App
