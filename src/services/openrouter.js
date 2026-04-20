import { listTools, mcpCall } from './mcp.js';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export const analyzeBrandWithAI = async (companyName) => {
  if (!OPENROUTER_API_KEY) {
    throw new Error("Missing VITE_OPENROUTER_API_KEY in .env");
  }

  // 1. Fetch live MCP tools from Peec via Streamable HTTP
  const peecToolsList = await listTools();

  // 2. Map MCP tool definitions to OpenAI function-calling format
  const openRouterTools = peecToolsList.map(t => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema || { type: "object", properties: {} }
    }
  }));

  const promptContext = `
    You are the BrandPulse AI backend. The company we are tracking is "${companyName}". 
    You MUST use the provided tools to query the live Peec AI MCP server for brand visibility, competitor data, and citation gaps.
    
    After gathering data via tools, return ONLY a raw JSON object matching this schema:
    {
      "visibilityData": { "overallScore": 85, "trend": "+12%", "sentiment": 88 },
      "alerts": [
        { "id": 1, "type": "Gain", "message": "Mention added in ChatGPT", "time": "Just now" }
      ],
      "citations": [
        { "id": 1, "query": "startup tools", "model": "Claude", "citedCompetitor": "Acme", "impact": "High", "suggestedAction": "Create comparison" }
      ]
    }
  `;

  const messages = [
    { role: "system", content: "You are an AI proxy orchestrator. Execute provided tools to gather company data, then return valid JSON matching the requested schema. No markdown, no explanation — only JSON." },
    { role: "user", content: promptContext }
  ];

  // 3. Initial LLM call with tools
  let response = await makeCompletionRequest(messages, openRouterTools);
  const messageContent = response.choices[0].message;

  // 4. If LLM wants to call tools, execute them against Peec MCP
  if (messageContent.tool_calls) {
    messages.push(messageContent);

    for (const toolCall of messageContent.tool_calls) {
      console.log(`🔧 Executing MCP tool: ${toolCall.function.name}`);
      const params = JSON.parse(toolCall.function.arguments);

      // Execute against Peec via authenticated Streamable HTTP
      const toolResult = await mcpCall(toolCall.function.name, params);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify(toolResult)
      });
    }

    // Let the LLM synthesize tool results into our schema
    response = await makeCompletionRequest(messages, openRouterTools);
  }

  // 5. Parse final JSON
  const rawContent = response.choices[0].message.content.trim();
  const jsonString = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonString);
};

const makeCompletionRequest = async (messages, tools) => {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "BrandPulse AI",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
    })
  });

  if (!res.ok) {
    throw new Error(`OpenRouter API Error: ${res.status}`);
  }
  return await res.json();
};
