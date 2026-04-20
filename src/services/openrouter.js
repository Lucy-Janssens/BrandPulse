/**
 * OpenRouter Service — AI Content Brief Generation only.
 * 
 * All structured data comes from direct MCP calls (peecData.js).
 * OpenRouter is used solely for generating actionable content strategies.
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

/**
 * Generate an AI content brief for a citation gap.
 * @param {Object} gap - The citation gap data from get_actions
 * @param {string} companyName - The tracked brand name
 * @returns {string} Markdown content brief
 */
export async function generateContentBrief(gap, companyName) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Missing VITE_OPENROUTER_API_KEY');
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'BrandPulse AI',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
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
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}
