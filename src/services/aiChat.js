import { mcpCall } from './mcp.js';
import { toObjects } from './peecData.js';
import { MCP_TOOL_SCHEMAS } from './mcpSchemas.js';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini';

/**
 * Handle a chat interaction that can use Peec MCP tools.
 * Handles the tool-calling orchestration loop client-side.
 * 
 * @param {Array} messageHistory - The full chat history string [{role, content}]
 * @param {Object} context - { projectId, ownBrandName, dateRange }
 * @param {Function} onToolCall - Callback when a tool starts executing
 * @returns {Object} { updatedHistory, finalMessage }
 */
export async function chatWithMCP(messageHistory, context, onToolCall) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Missing VITE_OPENROUTER_API_KEY');
  }

  // Define system prompt
  const systemPrompt = {
    role: 'system',
    content: `You are BrandPulse AI, the intelligent analyst assistant for tracking brands across AI Search Engines (Perplexity, ChatGPT, Claude, etc). 
    
You have direct access to the Peec AI Model Context Protocol (MCP) to fetch live data.
When the user asks a question about their brand's visibility, competitors, or citation gaps, YOU MUST use the provided tools to extract real data to back up your answer.

Current context:
- Project ID: ${context.projectId} (USE THIS for the project_id argument in tools!)
- Primary Brand: ${context.ownBrandName}
- Date Range: ${context.dateRange.start_date} to ${context.dateRange.end_date} (USE THIS for start_date and end_date arguments in tools!)

Always be concise, analytical, and actionable.`
  };

  const messages = [systemPrompt, ...messageHistory];

  const MAX_LOOPS = 5;
  let loops = 0;
  let isDone = false;
  let assistantMessage = null;

  while (!isDone && loops < MAX_LOOPS) {
    loops++;
    
    // Call OpenRouter
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'BrandPulse AI Chat',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: messages,
        tools: MCP_TOOL_SCHEMAS,
        tool_choice: "auto",
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
    const data = await res.json();
    assistantMessage = data.choices[0].message;
    
    // Add assistant's response to history
    messages.push(assistantMessage);

    // If the model didn't want to call any tools, we're done
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      isDone = true;
      break;
    }

    // Model wanted to call tools!
    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      // Notify the UI that we are working on it
      if (onToolCall) onToolCall(`Calling ${toolName}...`);
      
      try {
        // Execute the tool locally!
        const result = await mcpCall(toolName, args);
        
        // Transform the columnar data into a clean object array if possible to save tokens
        let parsedResult = result;
        if (toolName === 'get_brand_report' || toolName === 'get_domain_report' || toolName === 'get_url_report' || toolName === 'get_actions') {
           const objects = toObjects(result);
           parsedResult = objects.length > 50 ? objects.slice(0, 50) : objects; // Cap size to save tokens
        }

        // Add tool result to message history for the next iteration
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(parsedResult),
        });
      } catch (err) {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: `Error executing tool: ${err.message}`,
        });
      }
    }
  }

  // Remove the system prompt before returning the history to the UI
  messages.shift();
  
  return {
    updatedHistory: messages,
    finalMessage: assistantMessage.content,
  };
}
