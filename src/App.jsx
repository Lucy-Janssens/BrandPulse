import { useState, useEffect, useContext, createContext } from 'react'
import ConnectPeec from './components/ConnectPeec'
import PeecCallback from './components/PeecCallback'
import { AuthContext } from './context/AuthContext'
import AuthLayout from './components/AuthLayout'
import Onboarding from './components/Onboarding'
import { isMcpConnected } from './services/mcp'
import {
  fetchProjectContext,
  fetchOverviewKPIs,
  fetchVisibilityTrend,
  fetchVisibilityByModel,
  fetchVisibilityByTopic,
  fetchCompetitorTable,
  fetchCitationGapOverview,
  fetchCitationGapDetails,
  fetchTopDomains,
  fetchTopURLs,
  getDateRange,
} from './services/peecData'
import { generateContentBrief } from './services/openrouter'
import { runDailyAnalysis, clearAnalysisCache, getCachedAnalysis } from './services/dailyAnalysis'
import './index.css'

// --- Project Context ---
const ProjectContext = createContext(null);

// --- Shared Components ---

const Spinner = () => (
  <div className="flex items-center justify-center" style={{ padding: '3rem' }}>
    <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
  </div>
);

const ErrorBanner = ({ message, onRetry }) => (
  <div className="glass-panel flex items-center justify-between" style={{ padding: '1rem 1.5rem', borderColor: 'var(--color-secondary)' }}>
    <span className="text-sm" style={{ color: 'var(--color-secondary)' }}>⚠ {message}</span>
    {onRetry && <button onClick={onRetry} className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Retry</button>}
  </div>
);

const MetricCard = ({ label, value, sub, trend }) => (
  <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, minWidth: '180px' }}>
    <p className="text-muted text-sm" style={{ marginBottom: '0.5rem' }}>{label}</p>
    <div className="flex items-center gap-4">
      <span className="text-gradient" style={{ fontSize: '2.2rem', fontWeight: 700 }}>{value ?? '—'}</span>
      {trend != null && <span className={`badge ${trend >= 0 ? 'badge-green' : 'badge-red'}`}>{trend >= 0 ? '+' : ''}{trend}%</span>}
    </div>
    {sub && <p className="text-muted text-sm mt-2">{sub}</p>}
  </div>
);

const DateRangePicker = ({ days, onChange }) => (
  <div className="flex gap-2">
    {[7, 14, 30].map(d => (
      <button key={d} onClick={() => onChange(d)}
        style={{
          padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer',
          background: days === d ? 'var(--color-primary)' : 'transparent',
          border: `1px solid ${days === d ? 'var(--color-primary)' : 'var(--border-light)'}`,
          color: days === d ? '#fff' : 'var(--color-text-muted)',
        }}
      >{d}d</button>
    ))}
  </div>
);

// Percentage bar
const Bar = ({ value, color = 'var(--color-primary)' }) => (
  <div style={{ background: 'var(--color-bg-base)', height: '6px', borderRadius: '3px', overflow: 'hidden', flex: 1 }}>
    <div style={{ width: `${Math.min((value || 0) * 100, 100)}%`, height: '100%', background: color, borderRadius: '3px' }}></div>
  </div>
);

// --- MODULES ---

const OverviewDashboard = () => {
  const { projectId, dateRange, ownBrandName } = useContext(ProjectContext);
  const [kpis, setKpis] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [k, t] = await Promise.all([
        fetchOverviewKPIs(projectId, dateRange),
        fetchVisibilityTrend(projectId, dateRange),
      ]);
      setKpis(k); setTrend(t);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId, dateRange]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;

  const fmt = v => v != null ? `${(v * 100).toFixed(1)}%` : '—';

  return (
    <div className="flex-col gap-6" style={{ width: '100%' }}>
      <header className="flex justify-between items-center">
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Overview Dashboard</h2>
          <p className="text-muted">Live pulse for <strong>{ownBrandName}</strong> across AI search engines.</p>
        </div>
        <div className="badge badge-green" style={{ padding: '0.5rem 1rem' }}>
          <span style={{ marginRight: '0.5rem', width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%', display: 'inline-block' }}></span>
          Live MCP Connected
        </div>
      </header>

      <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
        <MetricCard label="Visibility" value={fmt(kpis?.visibility)} sub="Across all tracked AI models" />
        <MetricCard label="Share of Voice" value={fmt(kpis?.shareOfVoice)} sub="Among tracked brands" />
        <MetricCard label="Sentiment" value={kpis?.sentiment != null ? kpis.sentiment.toFixed(2) : '—'} sub="Average mention sentiment" />
        <MetricCard label="Avg Position" value={kpis?.position != null ? kpis.position.toFixed(1) : '—'} sub="Where your brand appears" />
      </div>

      {/* Trend sparkline */}
      {trend.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Visibility Trend ({dateRange.start_date} → {dateRange.end_date})</h3>
          <div className="flex items-end gap-2" style={{ height: '80px' }}>
            {trend.filter(t => t.brand_name === ownBrandName || t.is_own).map((t, i) => {
              const h = Math.max((t.visibility || 0) * 100, 4);
              return (
                <div key={i} title={`${t.date}: ${(t.visibility * 100).toFixed(1)}%`}
                  style={{ flex: 1, background: 'var(--color-primary)', borderRadius: '4px 4px 0 0', height: `${h}%`, minWidth: '6px', opacity: 0.6 + (t.visibility || 0) * 0.4 }}>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const VisibilityDeepDive = () => {
  const { projectId, dateRange } = useContext(ProjectContext);
  const [byModel, setByModel] = useState([]);
  const [byTopic, setByTopic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [m, t] = await Promise.all([
        fetchVisibilityByModel(projectId, dateRange),
        fetchVisibilityByTopic(projectId, dateRange),
      ]);
      setByModel(m); setByTopic(t);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId, dateRange]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;

  return (
    <div className="flex-col gap-6" style={{ width: '100%' }}>
      <header>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Visibility Deep-Dive</h2>
        <p className="text-muted">Breakdown by AI model and topic.</p>
      </header>

      <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
        {/* By Model */}
        <div className="glass-panel" style={{ flex: 1, minWidth: '300px', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>By AI Model</h3>
          <div className="flex-col gap-4">
            {byModel.map((row, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-sm" style={{ width: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.model_id || row.brand_name}</span>
                <Bar value={row.visibility} />
                <span className="text-sm text-muted" style={{ width: '50px', textAlign: 'right' }}>{((row.visibility || 0) * 100).toFixed(1)}%</span>
              </div>
            ))}
            {byModel.length === 0 && <p className="text-muted text-sm">No model data available yet.</p>}
          </div>
        </div>

        {/* By Topic */}
        <div className="glass-panel" style={{ flex: 1, minWidth: '300px', padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>By Topic</h3>
          <div className="flex-col gap-4">
            {byTopic.map((row, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-sm" style={{ width: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.topic_id || row.brand_name}</span>
                <Bar value={row.visibility} color="var(--color-secondary)" />
                <span className="text-sm text-muted" style={{ width: '50px', textAlign: 'right' }}>{((row.visibility || 0) * 100).toFixed(1)}%</span>
              </div>
            ))}
            {byTopic.length === 0 && <p className="text-muted text-sm">No topic data available yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const CompetitorRadar = () => {
  const { projectId, dateRange } = useContext(ProjectContext);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setBrands(await fetchCompetitorTable(projectId, dateRange)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId, dateRange]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;

  return (
    <div className="flex-col gap-6" style={{ width: '100%' }}>
      <header>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Competitor Radar</h2>
        <p className="text-muted">Share of voice across all tracked brands.</p>
      </header>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-strong)' }}>
              <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>#</th>
              <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Brand</th>
              <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Visibility</th>
              <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>SOV</th>
              <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Sentiment</th>
              <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Position</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b, i) => (
              <tr key={b.brand_id || i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>{i + 1}</td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  {b.brand_name}
                  {b.is_own && <span className="badge badge-green" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>YOU</span>}
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>{((b.visibility || 0) * 100).toFixed(1)}%</td>
                <td style={{ padding: '1.25rem 1.5rem' }}>{((b.share_of_voice || 0) * 100).toFixed(1)}%</td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <span className={b.sentiment > 0.6 ? 'text-gradient' : ''}>{b.sentiment != null ? b.sentiment.toFixed(2) : '—'}</span>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>{b.position != null ? b.position.toFixed(1) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {brands.length === 0 && <p className="text-muted text-sm" style={{ padding: '2rem', textAlign: 'center' }}>No brand data yet.</p>}
      </div>
    </div>
  );
};

const CitationGapAudit = () => {
  const { projectId, dateRange, ownBrandName } = useContext(ProjectContext);
  const [gaps, setGaps] = useState([]);
  const [details, setDetails] = useState(null);
  const [detailScope, setDetailScope] = useState(null);
  const [brief, setBrief] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setGaps(await fetchCitationGapOverview(projectId, dateRange)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const drillDown = async (scope) => {
    setDetailScope(scope);
    try { setDetails(await fetchCitationGapDetails(projectId, dateRange, scope)); }
    catch (e) { setError(e.message); }
  };

  const genBrief = async (gap, idx) => {
    setBrief(prev => ({ ...prev, [idx]: 'Generating...' }));
    try {
      const md = await generateContentBrief(gap, ownBrandName);
      setBrief(prev => ({ ...prev, [idx]: md }));
    } catch (e) {
      setBrief(prev => ({ ...prev, [idx]: `Error: ${e.message}` }));
    }
  };

  useEffect(() => { load(); }, [projectId, dateRange]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;

  return (
    <div className="flex-col gap-6" style={{ width: '100%' }}>
      <header>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Citation Gap Audit</h2>
        <p className="text-muted">Win back traffic where AI mentions you but cites competitors.</p>
      </header>

      {/* Overview cards */}
      <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
        {gaps.map((g, i) => (
          <div key={i} className="glass-panel" style={{ padding: '1.5rem', flex: '1 1 200px', cursor: 'pointer', borderColor: detailScope === (g.action_group_type || '').toLowerCase() ? 'var(--color-primary)' : undefined }}
            onClick={() => drillDown((g.action_group_type || '').toLowerCase())}>
            <p className="text-sm text-muted">{g.action_group_type}</p>
            <p className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{((g.opportunity_score || 0) * 100).toFixed(0)}</p>
            <p className="text-sm text-muted">Opportunity Score</p>
            <div className="flex justify-between mt-2">
              <span className="text-sm">Gap: {((g.gap_percentage || 0) * 100).toFixed(0)}%</span>
              <span className="text-sm">Coverage: {((g.coverage_percentage || 0) * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
        {gaps.length === 0 && <p className="text-muted">No citation gap data available.</p>}
      </div>

      {/* Drilldown */}
      {details && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', textTransform: 'capitalize' }}>{detailScope} Actions</h3>
          <div className="flex-col gap-4">
            {details.map((d, i) => (
              <div key={i} style={{ padding: '1rem', background: 'var(--color-bg-base)', borderRadius: '12px' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                  <div>
                    <span className="text-sm" style={{ color: 'var(--color-primary)' }}>{d.domain || d.url_classification || 'Action'}</span>
                    <span className="text-sm text-muted" style={{ marginLeft: '1rem' }}>Score: {((d.opportunity_score || 0) * 100).toFixed(0)}</span>
                  </div>
                  <button onClick={() => genBrief(d, i)} className="btn" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                    {brief[i] ? '↻ Regen' : '✨ Brief'}
                  </button>
                </div>
                {d.text && <p className="text-sm" style={{ marginBottom: '0.5rem' }}>{d.text}</p>}
                {brief[i] && (
                  <div style={{ background: 'rgba(99,102,241,0.08)', borderLeft: '3px solid var(--color-primary)', padding: '1rem', borderRadius: '0 8px 8px 0', marginTop: '0.5rem' }}>
                    <pre className="text-sm" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-family)' }}>{brief[i]}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SourcesExplorer = () => {
  const { projectId, dateRange } = useContext(ProjectContext);
  const [domains, setDomains] = useState([]);
  const [urls, setUrls] = useState([]);
  const [tab, setTab] = useState('domains');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [d, u] = await Promise.all([
        fetchTopDomains(projectId, dateRange),
        fetchTopURLs(projectId, dateRange),
      ]);
      setDomains(d); setUrls(u);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId, dateRange]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;

  const classColor = (c) => {
    const map = { OWN: '#4ade80', CORPORATE: '#6366f1', EDITORIAL: '#f59e0b', UGC: '#ef4444', REFERENCE: '#8b5cf6', COMPETITOR: '#ef4444' };
    return map[c] || 'var(--color-text-muted)';
  };

  return (
    <div className="flex-col gap-6" style={{ width: '100%' }}>
      <header className="flex justify-between items-center">
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Sources Explorer</h2>
          <p className="text-muted">URLs and domains AI models are citing.</p>
        </div>
        <div className="flex gap-2">
          {['domains', 'urls'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', textTransform: 'capitalize',
              background: tab === t ? 'var(--color-primary)' : 'transparent',
              border: `1px solid ${tab === t ? 'var(--color-primary)' : 'var(--border-light)'}`,
              color: tab === t ? '#fff' : 'var(--color-text-muted)', fontSize: '0.85rem',
            }}>{t}</button>
          ))}
        </div>
      </header>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-strong)' }}>
              {tab === 'domains' ? (<>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Domain</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Type</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Retrieved %</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Citation Rate</th>
              </>) : (<>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>URL</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Type</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Citations</th>
                <th style={{ padding: '1.25rem 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Citation Rate</th>
              </>)}
            </tr>
          </thead>
          <tbody>
            {tab === 'domains' ? domains.map((d, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '1.25rem 1.5rem', fontWeight: 500 }}>{d.domain}</td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <span style={{ color: classColor(d.classification), fontSize: '0.85rem', fontWeight: 500 }}>{d.classification || '—'}</span>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>{((d.retrieved_percentage || 0) * 100).toFixed(1)}%</td>
                <td style={{ padding: '1.25rem 1.5rem' }}>{(d.citation_rate || 0).toFixed(2)}</td>
              </tr>
            )) : urls.map((u, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '1.25rem 1.5rem', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <a href={u.url} target="_blank" rel="noopener" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{u.title || u.url}</a>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--color-bg-surface-hover)' }}>{u.classification || '—'}</span>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>{u.citation_count ?? '—'}</td>
                <td style={{ padding: '1.25rem 1.5rem' }}>{(u.citation_rate || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {((tab === 'domains' && domains.length === 0) || (tab === 'urls' && urls.length === 0)) && (
          <p className="text-muted text-sm" style={{ padding: '2rem', textAlign: 'center' }}>No source data yet.</p>
        )}
      </div>
    </div>
  );
};

// --- Daily AI Briefing ---

const DailyBriefing = () => {
  const { projectId, dateRange, ownBrandName } = useContext(ProjectContext);
  const [analysis, setAnalysis] = useState(getCachedAnalysis());
  const [loading, setLoading] = useState(!analysis);
  const [error, setError] = useState(null);

  const load = async (force = false) => {
    setLoading(true); setError(null);
    if (force) clearAnalysisCache();
    try {
      const result = await runDailyAnalysis(projectId, ownBrandName);
      setAnalysis(result);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (!analysis) load(); }, [projectId]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} onRetry={() => load(true)} />;
  if (!analysis?.analysis) return null;

  const a = analysis.analysis;
  const scoreColor = a.healthScore >= 70 ? '#4ade80' : a.healthScore >= 40 ? '#f59e0b' : '#ef4444';
  const prioColor = { high: '#ef4444', medium: '#f59e0b', low: '#6366f1' };
  const findingIcon = { positive: '↑', negative: '↓', neutral: '→' };
  const findingColor = { positive: '#4ade80', negative: '#ef4444', neutral: 'var(--color-text-muted)' };

  return (
    <div className="flex-col gap-6" style={{ width: '100%' }}>
      <header className="flex justify-between items-center">
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Daily AI Briefing</h2>
          <p className="text-muted">Auto-generated {analysis.date} • Powered by OpenRouter</p>
        </div>
        <button onClick={() => load(true)} className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>↻ Refresh</button>
      </header>

      {/* Health Score + Headline */}
      <div className="glass-panel flex items-center gap-6" style={{ padding: '2rem' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: `4px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: scoreColor }}>{a.healthScore}</span>
        </div>
        <div>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>{a.headline}</h3>
          {a.competitorAlert && <p className="text-sm" style={{ color: '#f59e0b' }}>⚡ {a.competitorAlert}</p>}
          {a.citationOpportunity && <p className="text-sm" style={{ color: 'var(--color-primary)' }}>🎯 {a.citationOpportunity}</p>}
        </div>
      </div>

      {/* Key Findings */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Key Findings</h3>
        <div className="flex-col gap-3">
          {a.keyFindings?.map((f, i) => (
            <div key={i} className="flex items-center gap-3" style={{ padding: '0.75rem 1rem', background: 'var(--color-bg-base)', borderRadius: '10px' }}>
              <span style={{ color: findingColor[f.type], fontWeight: 700, fontSize: '1.1rem' }}>{findingIcon[f.type]}</span>
              <span className="text-sm">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Proposed Actions */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Proposed Actions</h3>
        <div className="flex-col gap-4">
          {a.proposedActions?.map((action, i) => (
            <div key={i} style={{ padding: '1.25rem', background: 'var(--color-bg-base)', borderRadius: '12px', borderLeft: `4px solid ${prioColor[action.priority]}` }}>
              <div className="flex items-center gap-3" style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: prioColor[action.priority], letterSpacing: '0.05em' }}>{action.priority}</span>
                <span style={{ fontWeight: 600 }}>{action.title}</span>
              </div>
              <p className="text-sm text-muted" style={{ marginBottom: '0.25rem' }}>{action.description}</p>
              {action.impact && <p className="text-sm" style={{ color: 'var(--color-primary)' }}>→ {action.impact}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- LAYOUT ---

function DashboardLayout() {
  const [activeModule, setActiveModule] = useState('Daily Briefing');
  const [rangeDays, setRangeDays] = useState(30);
  const [ctx, setCtx] = useState(null);
  const [ctxLoading, setCtxLoading] = useState(true);
  const [ctxError, setCtxError] = useState(null);
  const { user, logout } = useContext(AuthContext);

  const dateRange = getDateRange(rangeDays);

  // Add spin animation
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Load project context
  useEffect(() => {
    setCtxLoading(true);
    fetchProjectContext()
      .then(c => { setCtx(c); setCtxError(null); })
      .catch(e => setCtxError(e.message))
      .finally(() => setCtxLoading(false));
  }, []);

  const modules = {
    'Daily Briefing': <DailyBriefing />,
    'Overview': <OverviewDashboard />,
    'Visibility Deep-Dive': <VisibilityDeepDive />,
    'Competitor Radar': <CompetitorRadar />,
    'Citation Gap Audit': <CitationGapAudit />,
    'Sources Explorer': <SourcesExplorer />,
  };

  if (ctxLoading) return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: 'var(--color-bg-base)' }}>
      <div className="flex-col items-center gap-4">
        <Spinner />
        <p className="text-muted">Loading project data from Peec AI...</p>
      </div>
    </div>
  );

  if (ctxError) return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: 'var(--color-bg-base)' }}>
      <ErrorBanner message={ctxError} onRetry={() => window.location.reload()} />
    </div>
  );

  const projectCtx = {
    projectId: ctx.project.id,
    dateRange,
    ownBrandName: ctx.ownBrand?.name || user?.team?.companyName || 'Your Brand',
    brands: ctx.brands,
    models: ctx.models,
    topics: ctx.topics,
  };

  return (
    <ProjectContext.Provider value={projectCtx}>
      <div className="app-container" style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside className="glass-panel sidebar" style={{
          width: '280px', borderLeft: 'none', borderTop: 'none', borderBottom: 'none',
          borderRadius: '0 16px 16px 0', padding: '2rem 1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-primary)' }}></div>
            <h1 className="text-gradient" style={{ fontSize: '1.5rem', letterSpacing: '-0.5px' }}>BrandPulse AI</h1>
          </div>

          <div className="flex-col gap-1">
            <span className="text-sm text-muted">Project</span>
            <span className="badge badge-green" style={{ alignSelf: 'flex-start' }}>{ctx.project.name}</span>
          </div>

          <DateRangePicker days={rangeDays} onChange={setRangeDays} />

          <nav className="flex-col gap-2" style={{ flex: 1 }}>
            {Object.keys(modules).map(name => (
              <button key={name} onClick={() => setActiveModule(name)}
                style={{
                  background: activeModule === name ? 'var(--color-bg-surface-hover)' : 'transparent',
                  border: '1px solid', borderColor: activeModule === name ? 'var(--color-primary)' : 'transparent',
                  color: activeModule === name ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                  padding: '0.75rem 1rem', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                  fontFamily: 'var(--font-family)', fontSize: '0.95rem',
                  fontWeight: activeModule === name ? 500 : 400, transition: 'all 0.2s',
                }}>{name}</button>
            ))}
          </nav>

          <div className="flex items-center justify-between" style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <span className="text-sm text-muted">{user?.email?.split('@')[0]}</span>
            <button onClick={logout} className="text-sm" style={{ color: 'var(--color-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Exit</button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: '3rem 4rem', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {modules[activeModule]}
        </main>
      </div>
    </ProjectContext.Provider>
  );
}

// --- APP ---

function App() {
  const { user, loading } = useContext(AuthContext);

  if (window.location.pathname === '/callback') return <PeecCallback />;
  if (loading) return null;
  if (!user) return <AuthLayout />;
  if (!user.team) return <Onboarding />;
  if (!isMcpConnected()) return <ConnectPeec />;

  return <DashboardLayout />;
}

export default App
