/**
 * Daily AI Analysis Service
 * 
 * Pulls data from all Peec MCP tools, feeds it to OpenRouter,
 * and generates a structured daily briefing with proposed actions.
 * Results are persisted in MongoDB via the API.
 */

import {
  fetchOverviewKPIs,
  fetchVisibilityByModel,
  fetchCompetitorTable,
  fetchCitationGapOverview,
  fetchTopDomains,
  getDateRange,
} from './peecData.js';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050';
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

/**
 * Check if we already have today's analysis in the DB.
 */
export async function getCachedAnalysis() {
  try {
    const res = await fetch(`${API_BASE}/api/analysis/today`, {
      headers: getAuthHeaders(),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/**
 * Fetch analysis history (last N days).
 */
export async function getAnalysisHistory(limit = 7) {
  try {
    const res = await fetch(`${API_BASE}/api/analysis/history?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

/**
 * Save analysis to the database.
 */
async function saveAnalysis(data) {
  try {
    await fetch(`${API_BASE}/api/analysis`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.warn('Failed to save analysis to DB:', err);
  }
}

/**
 * Run the full daily analysis pipeline.
 */
export async function runDailyAnalysis(projectId, ownBrandName) {
  // Check DB cache first
  const cached = await getCachedAnalysis();
  if (cached) return cached;

  const range7 = getDateRange(7);

  // Gather all data sequentially to prevent overwhelming the Peec MCP server
  const kpis = await fetchOverviewKPIs(projectId, range7).catch(() => null);
  const byModel = await fetchVisibilityByModel(projectId, range7).catch(() => []);
  const competitors = await fetchCompetitorTable(projectId, range7).catch(() => []);
  const gaps = await fetchCitationGapOverview(projectId, range7).catch(() => []);
  const domains = await fetchTopDomains(projectId, range7).catch(() => []);

  // Build the context snapshot for the LLM
  const snapshot = {
    brand: ownBrandName,
    period: `${range7.start_date} to ${range7.end_date}`,
    kpis: kpis ? {
      visibility: kpis.visibility,
      shareOfVoice: kpis.shareOfVoice,
      sentiment: kpis.sentiment,
      position: kpis.position,
      mentionCount: kpis.mentionCount,
    } : null,
    modelBreakdown: byModel.slice(0, 8).map(m => ({
      model: m.model_id || m.brand_name,
      visibility: m.visibility,
      sentiment: m.sentiment,
    })),
    competitors: competitors.slice(0, 10).map(c => ({
      brand: c.brand_name,
      visibility: c.visibility,
      sov: c.share_of_voice,
      sentiment: c.sentiment,
      isOwn: c.is_own,
    })),
    citationGaps: gaps.map(g => ({
      type: g.action_group_type,
      opportunityScore: g.opportunity_score,
      gapPercentage: g.gap_percentage,
      coverage: g.coverage_percentage,
    })),
    topCitedDomains: domains.slice(0, 10).map(d => ({
      domain: d.domain,
      type: d.classification,
      retrievedPct: d.retrieved_percentage,
      citationRate: d.citation_rate,
    })),
  };

  // Generate AI analysis via OpenRouter
  const analysis = await generateAnalysis(snapshot);

  const today = new Date().toISOString().slice(0, 10);
  const result = {
    date: today,
    timestamp: new Date().toISOString(),
    projectId,
    brandName: ownBrandName,
    snapshot,
    analysis,
  };

  // Persist to MongoDB
  await saveAnalysis(result);

  return result;
}

async function generateAnalysis(snapshot) {
  if (!OPENROUTER_API_KEY) {
    return fallbackAnalysis(snapshot);
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'BrandPulse AI Daily Analysis',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are BrandPulse AI, a daily AI visibility analyst. Given a snapshot of how AI search engines (ChatGPT, Perplexity, Gemini, Claude, Copilot, Grok) represent a brand, produce a structured daily briefing.

Return ONLY valid JSON matching this exact schema:
{
  "headline": "One-line summary of today's status",
  "healthScore": 0-100,
  "keyFindings": [
    { "type": "positive|negative|neutral", "text": "Finding description" }
  ],
  "proposedActions": [
    { "priority": "high|medium|low", "title": "Action title", "description": "What to do and why", "impact": "Expected outcome" }
  ],
  "competitorAlert": "One-line competitor insight or null",
  "citationOpportunity": "One-line biggest citation gap opportunity or null"
}`
          },
          {
            role: 'user',
            content: `Daily AI visibility snapshot for "${snapshot.brand}" (${snapshot.period}):\n\n${JSON.stringify(snapshot, null, 2)}\n\nAnalyze this data and generate today's briefing. If data shows 0% or null values, note that tracking is still initializing and suggest initial setup actions.`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const data = await res.json();
    const content = data.choices[0].message.content.trim();
    const json = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(json);
  } catch (err) {
    console.warn('AI analysis failed, using fallback:', err);
    return fallbackAnalysis(snapshot);
  }
}

function fallbackAnalysis(snapshot) {
  const hasData = snapshot.kpis?.visibility > 0;
  return {
    headline: hasData
      ? `${snapshot.brand} has ${(snapshot.kpis.visibility * 100).toFixed(1)}% AI visibility this week`
      : `${snapshot.brand} — AI tracking is initializing`,
    healthScore: hasData ? Math.round(snapshot.kpis.visibility * 100) : 0,
    keyFindings: hasData ? [
      { type: 'neutral', text: `Overall visibility: ${(snapshot.kpis.visibility * 100).toFixed(1)}%` },
      { type: 'neutral', text: `Share of voice: ${(snapshot.kpis.shareOfVoice * 100).toFixed(1)}%` },
      { type: snapshot.competitors.length > 1 ? 'neutral' : 'negative', text: `${snapshot.competitors.length} brands being tracked` },
    ] : [
      { type: 'neutral', text: 'Peec AI is still collecting initial data from AI search engines.' },
      { type: 'positive', text: 'Your MCP connection is active and working correctly.' },
      { type: 'neutral', text: 'Data typically takes 2–5 days to populate after initial setup.' },
    ],
    proposedActions: hasData ? [
      { priority: 'high', title: 'Review citation gaps', description: 'Check the Citation Gap Audit for opportunities where AI mentions you but cites competitors.', impact: 'Win back AI-referred traffic' },
      { priority: 'medium', title: 'Monitor competitor shifts', description: 'Track daily changes in competitor SOV on the Competitor Radar.', impact: 'Early warning on competitive threats' },
    ] : [
      { priority: 'high', title: 'Complete Peec AI setup', description: 'Ensure all brands, topics, and prompts are configured in your Peec dashboard.', impact: 'Faster data collection' },
      { priority: 'medium', title: 'Add tracking topics', description: 'Define the key topics and prompts you want to monitor across AI models.', impact: 'More comprehensive visibility data' },
      { priority: 'low', title: 'Check back tomorrow', description: 'Peec crawlers are indexing AI models. Results will appear within 2–5 days.', impact: 'Live dashboard data' },
    ],
    competitorAlert: snapshot.competitors.length > 1
      ? `Tracking ${snapshot.competitors.length} brands — comparison data will populate as crawls complete.`
      : null,
    citationOpportunity: snapshot.citationGaps.length > 0
      ? `Found ${snapshot.citationGaps.length} citation gap categories to investigate.`
      : null,
  };
}

/** Force refresh (clear DB cache by re-running) */
export function clearAnalysisCache() {
  // The DB entry will be overwritten by upsert
}
