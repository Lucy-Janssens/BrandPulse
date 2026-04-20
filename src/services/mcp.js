/**
 * Peec MCP Client — Streamable HTTP transport
 * 
 * All MCP calls are POST https://api.peec.ai/mcp with JSON-RPC 2.0.
 * Auth is handled by the peecAuth module (OAuth 2.0 PKCE Bearer tokens).
 */

import { getValidAccessToken, isTokenExpired, getStoredTokens } from './peecAuth.js';

const MCP_ENDPOINT = '/peec-mcp';  // Proxied through Vite to https://api.peec.ai/mcp

let mcpSessionId = null;
let isInitialized = false;
let jsonRpcId = 0;

function nextId() {
  return ++jsonRpcId;
}

/**
 * Core MCP JSON-RPC call via Streamable HTTP.
 * Handles auth token injection, session tracking, and response parsing.
 */
async function mcpRequest(method, params = {}) {
  const accessToken = await getValidAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'Authorization': `Bearer ${accessToken}`,
  };

  if (mcpSessionId) {
    headers['Mcp-Session-Id'] = mcpSessionId;
  }

  const body = {
    jsonrpc: '2.0',
    id: nextId(),
    method,
    params,
  };

  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  // Capture session ID from response
  const sessionHeader = res.headers.get('mcp-session-id');
  if (sessionHeader) {
    mcpSessionId = sessionHeader;
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MCP ${method} failed (${res.status}): ${errText}`);
  }

  const contentType = res.headers.get('content-type') || '';

  // Handle SSE streaming responses
  if (contentType.includes('text/event-stream')) {
    return await parseSSEResponse(res);
  }

  // Handle standard JSON-RPC response
  const json = await res.json();
  if (json.error) {
    throw new Error(`MCP error ${json.error.code}: ${json.error.message}`);
  }
  return json.result;
}

/**
 * Parse Server-Sent Events response for streaming MCP results
 */
async function parseSSEResponse(res) {
  const text = await res.text();
  const lines = text.split('\n');
  let lastData = null;

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const parsed = JSON.parse(line.slice(6));
        lastData = parsed;
      } catch (e) {
        // skip non-JSON data lines
      }
    }
  }

  if (lastData?.result) return lastData.result;
  if (lastData?.error) throw new Error(`MCP SSE error: ${lastData.error.message}`);
  return lastData;
}

// --- Public API ---

/**
 * Initialize the MCP session. Must be called once before other operations.
 */
export async function initializeMcp() {
  if (isInitialized) return;

  const result = await mcpRequest('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: {
      name: 'BrandPulse AI',
      version: '1.0.0',
    },
  });

  console.log('✅ MCP session initialized:', result);
  isInitialized = true;

  // Send initialized notification (no id = notification)
  await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getValidAccessToken()}`,
      ...(mcpSessionId ? { 'Mcp-Session-Id': mcpSessionId } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }),
  });

  return result;
}

/**
 * List all available Peec MCP tools.
 */
export async function listTools() {
  await initializeMcp();
  const result = await mcpRequest('tools/list');
  console.log(`📦 Peec MCP Tools (${result.tools?.length || 0}):`, result.tools?.map(t => t.name));
  return result.tools || [];
}

/**
 * Call a specific Peec MCP tool by name with arguments.
 */
export async function callTool(name, args = {}) {
  await initializeMcp();
  console.log(`🔧 Calling MCP tool: ${name}`, args);
  const result = await mcpRequest('tools/call', { name, arguments: args });
  return result;
}

/**
 * Single entry point for dashboard components.
 * Wraps tool calls with error handling and token refresh.
 */
export async function mcpCall(toolName, args = {}) {
  try {
    const result = await callTool(toolName, args);
    return result;
  } catch (err) {
    // If it's an auth error, the token may have been revoked
    if (err.message.includes('401') || err.message.includes('invalid_token')) {
      console.warn('MCP auth error, clearing tokens');
      const { clearTokens } = await import('./peecAuth.js');
      clearTokens();
    }
    throw err;
  }
}

/**
 * Check if we have a valid MCP connection (valid token stored).
 */
export function isMcpConnected() {
  const tokens = getStoredTokens();
  return tokens !== null && !isTokenExpired();
}

/**
 * Reset MCP session state (e.g., on logout).
 */
export function resetMcp() {
  mcpSessionId = null;
  isInitialized = false;
  jsonRpcId = 0;
}
