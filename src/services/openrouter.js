/**
 * OpenRouter Service — AI Narrative Generation.
 *
 * All structured data comes from direct MCP calls (peecData.js).
 * OpenRouter is used for generating actionable content strategies and narratives.
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini';

async function callOpenRouter(messages, temperature = 0.3) {
  if (!OPENROUTER_API_KEY) throw new Error('Missing VITE_OPENROUTER_API_KEY');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'BrandPulse AI',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages, temperature }),
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

function parseJsonSafe(raw) {
  try {
    return JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch {
    return null;
  }
}

/**
 * Generate an AI content brief for a citation gap.
 * @param {Object} gap - The citation gap data from get_actions
 * @param {string} companyName - The tracked brand name
 * @returns {string} Markdown content brief
 */
export async function generateContentBrief(gap, companyName) {
  return callOpenRouter([
    {
      role: 'system',
      content: `You are an AI visibility strategist. Given a citation gap analysis, generate a concise, actionable content brief that explains exactly what ${companyName} should add or improve on their page to win citations from AI search engines. Format as markdown with clear headings.`,
    },
    {
      role: 'user',
      content: `Citation gap analysis for ${companyName}:
- Action type: ${gap.group_type || gap.action_group_type || 'Unknown'}
- Domain: ${gap.domain || 'N/A'}
- URL classification: ${gap.url_classification || 'N/A'}
- Opportunity score: ${gap.opportunity_score || 'N/A'}
- Gap percentage: ${gap.gap_percentage || 'N/A'}%
- Coverage: ${gap.coverage_percentage || 'N/A'}%
- Recommendation text: ${gap.text || 'N/A'}

Generate a brief content strategy (3–5 bullet points) to close this gap.`,
    },
  ], 0.4);
}

/**
 * Generate a weekly delta narrative comparing two 7-day windows.
 * @param {Object} thisWeek  - KPIs for the last 7 days
 * @param {Object} lastWeek  - KPIs for the 7 days before that
 * @param {Array}  modelBreakdown - Per-model visibility for this week
 * @param {string} brandName
 * @returns {Object} { headline, deltas, biggestRisk, biggestWin }
 */
export async function generateWeeklyDeltaNarrative(thisWeek, lastWeek, modelBreakdown, brandName) {
  const fallback = () => {
    const visChange = thisWeek?.visibility != null && lastWeek?.visibility != null
      ? ((thisWeek.visibility - lastWeek.visibility) * 100).toFixed(1)
      : null;
    return {
      headline: visChange != null
        ? `${brandName}'s visibility ${visChange >= 0 ? 'grew' : 'fell'} ${Math.abs(visChange)}% this week vs last week.`
        : `Insufficient data to compute a weekly delta for ${brandName} yet.`,
      deltas: [],
      biggestRisk: null,
      biggestWin: null,
    };
  };

  if (!OPENROUTER_API_KEY) return fallback();

  try {
    const raw = await callOpenRouter([
      {
        role: 'system',
        content: `You are BrandPulse AI, a senior AI visibility analyst. Compare two consecutive 7-day snapshots and write a sharp, executive-level delta narrative. Return ONLY valid JSON:
{
  "headline": "One punchy sentence summarising the week-on-week story",
  "deltas": [
    { "metric": "Visibility", "current": "12.4%", "previous": "10.1%", "change": "+2.3pp", "direction": "up|down|flat", "insight": "Led by ChatGPT climbing 5pp" }
  ],
  "biggestRisk": "One sentence on the biggest threat, or null",
  "biggestWin": "One sentence on the biggest positive signal, or null"
}
Return 2–4 delta rows covering Visibility, Share of Voice, Sentiment, and Position.`,
      },
      {
        role: 'user',
        content: `Brand: ${brandName}

THIS WEEK (last 7 days):
${JSON.stringify(thisWeek, null, 2)}

LAST WEEK (7 days before that):
${JSON.stringify(lastWeek, null, 2)}

TOP AI MODELS THIS WEEK:
${JSON.stringify(modelBreakdown?.slice(0, 6), null, 2)}

Write the weekly delta narrative.`,
      },
    ]);
    return parseJsonSafe(raw) || fallback();
  } catch {
    return fallback();
  }
}

/**
 * Generate an AI competitive narrative from the brand comparison table.
 * @param {Array}  brands      - Sorted competitor table rows
 * @param {string} ownBrandName
 * @returns {Object} { summary, leadingBrand, whyLeading, threatLevel, opportunity }
 */
export async function generateCompetitorNarrative(brands, ownBrandName) {
  const fallback = () => {
    const leader = brands[0];
    const own = brands.find(b => b.is_own);
    return {
      summary: leader
        ? `${leader.brand_name} leads the competitive set with ${((leader.share_of_voice || 0) * 100).toFixed(1)}% share of voice.`
        : 'Competitor data is loading.',
      leadingBrand: leader?.brand_name || null,
      whyLeading: null,
      threatLevel: 'medium',
      opportunity: own
        ? `${ownBrandName} holds ${((own.share_of_voice || 0) * 100).toFixed(1)}% SOV — check the Citation Gap Audit for quick wins.`
        : null,
    };
  };

  if (!OPENROUTER_API_KEY || brands.length === 0) return fallback();

  try {
    const raw = await callOpenRouter([
      {
        role: 'system',
        content: `You are BrandPulse AI, a competitive intelligence analyst. Given a brand comparison table from AI search engines, produce a sharp competitive narrative. Return ONLY valid JSON:
{
  "summary": "2–3 sentence competitive landscape overview",
  "leadingBrand": "Brand name of the leader",
  "whyLeading": "One sentence explaining the likely reason (e.g. content type, topic dominance)",
  "threatLevel": "low|medium|high",
  "opportunity": "One specific, actionable opportunity for the own brand"
}`,
      },
      {
        role: 'user',
        content: `Own brand: ${ownBrandName}

Brand comparison table (sorted by share of voice):
${JSON.stringify(brands.slice(0, 15).map(b => ({
  brand: b.brand_name,
  isOwn: b.is_own,
  visibility: b.visibility != null ? `${(b.visibility * 100).toFixed(1)}%` : null,
  shareOfVoice: b.share_of_voice != null ? `${(b.share_of_voice * 100).toFixed(1)}%` : null,
  sentiment: b.sentiment != null ? b.sentiment.toFixed(2) : null,
  position: b.position != null ? b.position.toFixed(1) : null,
})), null, 2)}

Write the competitive narrative.`,
      },
    ]);
    return parseJsonSafe(raw) || fallback();
  } catch {
    return fallback();
  }
}
