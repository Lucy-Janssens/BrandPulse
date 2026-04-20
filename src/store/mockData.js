export const mockVisibilityData = {
  overallScore: 78,
  trend: '+5%',
  sentiment: 82,
  averageRank: 2.4,
  modelBreakdown: [
    { model: 'ChatGPT', score: 85, topTopic: 'Pricing' },
    { model: 'Perplexity', score: 92, topTopic: 'Features' },
    { model: 'Gemini', score: 45, topTopic: 'Unknown' },
    { model: 'Claude', score: 70, topTopic: 'Use Cases' }
  ]
};

export const mockCompetitorData = [
  { rank: 1, name: 'BrandPulse (You)', shareOfVoice: 42, sentiment: 82, trend: 'up' },
  { rank: 2, name: 'Acme Corp', shareOfVoice: 28, sentiment: 65, trend: 'down' },
  { rank: 3, name: 'Global Tech', shareOfVoice: 15, sentiment: 70, trend: 'neutral' },
  { rank: 4, name: 'Startup Inc', shareOfVoice: 15, sentiment: 40, trend: 'down' }
];

export const mockCitationGaps = [
  { 
    id: 1, 
    query: "best ai tracking software for startups", 
    model: "ChatGPT", 
    citedCompetitor: "Acme Corp", 
    impact: "High", 
    suggestedAction: "Add a 'Startup use-cases' section to the pricing page emphasizing ease of onboarding."
  },
  { 
    id: 2, 
    query: "brandpulse vs global tech", 
    model: "Perplexity", 
    citedCompetitor: "Global Tech", 
    impact: "Medium", 
    suggestedAction: "Create a dedicated comparison landing page targeting functionality differences."
  }
];

export const mockAlerts = [
  { id: 1, type: 'Drop', message: 'Gemini visibility for "startup" dropped by 12%', time: '2h ago' },
  { id: 2, type: 'Gain', message: 'ChatGPT now ranks you as #1 for "real-time sentiment"', time: '5h ago' }
];
