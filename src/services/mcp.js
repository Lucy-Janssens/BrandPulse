/**
 * Peec MCP Client — Uses the official @modelcontextprotocol/sdk
 * with StreamableHTTPClientTransport and built-in OAuth PKCE.
 * 
 * All requests to api.peec.ai are routed through Vite's proxy (/peec-api/*)
 * to bypass CORS. A custom fetch function rewrites absolute api.peec.ai URLs
 * so the SDK's internal discovery, registration, and token exchange calls
 * all go through the proxy seamlessly.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const PEEC_ORIGIN = 'https://api.peec.ai';
const PROXY_PREFIX = '/peec-api';
const MCP_SERVER_URL = `${PROXY_PREFIX}/mcp`;
const REDIRECT_URI = `${window.location.origin}/callback`;

// Storage keys
const STORAGE = {
  tokens: 'peec_oauth_tokens',
  clientInfo: 'peec_client_info',
  codeVerifier: 'peec_code_verifier',
  discoveryState: 'peec_discovery_state',
};

// Singleton
let mcpClient = null;
let mcpTransport = null;

/**
 * Custom fetch that rewrites api.peec.ai URLs to go through the Vite proxy.
 * The authorize endpoint is excluded — it needs a real browser redirect.
 */
function proxyFetch(input, init) {
  let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  
  // Rewrite absolute api.peec.ai URLs to local proxy
  if (url.startsWith(PEEC_ORIGIN)) {
    url = url.replace(PEEC_ORIGIN, PROXY_PREFIX);
  }
  
  return fetch(url, init);
}

/**
 * Browser-based OAuth provider implementing the MCP SDK's OAuthClientProvider.
 */
function createBrowserAuthProvider() {
  return {
    get redirectUrl() {
      return REDIRECT_URI;
    },

    get clientMetadata() {
      return {
        client_name: 'BrandPulse AI',
        redirect_uris: [REDIRECT_URI],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      };
    },

    clientInformation() {
      const stored = localStorage.getItem(STORAGE.clientInfo);
      return stored ? JSON.parse(stored) : undefined;
    },

    saveClientInformation(info) {
      localStorage.setItem(STORAGE.clientInfo, JSON.stringify(info));
    },

    tokens() {
      const stored = localStorage.getItem(STORAGE.tokens);
      return stored ? JSON.parse(stored) : undefined;
    },

    saveTokens(tokens) {
      localStorage.setItem(STORAGE.tokens, JSON.stringify(tokens));
    },

    redirectToAuthorization(url) {
      // This is the one URL that MUST go directly to api.peec.ai (browser redirect, not fetch)
      sessionStorage.setItem('peec_return_url', window.location.href);
      window.location.href = url.toString();
    },

    saveCodeVerifier(verifier) {
      sessionStorage.setItem(STORAGE.codeVerifier, verifier);
    },

    codeVerifier() {
      return sessionStorage.getItem(STORAGE.codeVerifier) || '';
    },

    saveDiscoveryState(state) {
      sessionStorage.setItem(STORAGE.discoveryState, JSON.stringify(state));
    },

    discoveryState() {
      const stored = sessionStorage.getItem(STORAGE.discoveryState);
      return stored ? JSON.parse(stored) : undefined;
    },

    invalidateCredentials(type) {
      if (type === 'all') {
        localStorage.removeItem(STORAGE.clientInfo);
        localStorage.removeItem(STORAGE.tokens);
      } else if (type === 'tokens') {
        localStorage.removeItem(STORAGE.tokens);
      }
    },

    // Override resource URL validation — our proxy URL maps to the real Peec resource
    validateResourceURL(defaultResource, serverResource) {
      // Always return the server's canonical resource URL so the token request
      // uses the real origin, not our localhost proxy path
      if (serverResource) {
        return new URL(serverResource);
      }
      return new URL(`${PEEC_ORIGIN}/mcp`);
    },
  };
}

/**
 * Get or create the MCP client. Triggers OAuth if not yet authorized.
 */
async function getClient() {
  if (mcpClient) return mcpClient;

  const authProvider = createBrowserAuthProvider();

  mcpTransport = new StreamableHTTPClientTransport(
    new URL(MCP_SERVER_URL, window.location.origin),
    {
      authProvider,
      fetch: proxyFetch,  // Route all SDK fetches through our CORS proxy
    }
  );

  mcpClient = new Client(
    { name: 'BrandPulse AI', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  await mcpClient.connect(mcpTransport);
  console.log('✅ MCP client connected to Peec AI');
  return mcpClient;
}

/**
 * Handle the OAuth callback — exchanges code for tokens via SDK.
 */
export async function handleOAuthCallback(code) {
  const authProvider = createBrowserAuthProvider();

  const transport = new StreamableHTTPClientTransport(
    new URL(MCP_SERVER_URL, window.location.origin),
    {
      authProvider,
      fetch: proxyFetch,
    }
  );

  // SDK's finishAuth does discovery + token exchange using our proxy fetch
  await transport.finishAuth(code);
  console.log('✅ OAuth tokens acquired');
}

/**
 * List all available Peec MCP tools.
 */
export async function listTools() {
  const client = await getClient();
  const result = await client.listTools();
  console.log(`📦 ${result.tools?.length || 0} Peec MCP tools available`);
  return result.tools || [];
}

/**
 * Call a specific Peec MCP tool.
 */
export async function callTool(name, args = {}) {
  const client = await getClient();
  console.log(`🔧 Calling: ${name}`, args);
  return await client.callTool({ name, arguments: args });
}

/**
 * Single entry point for all dashboard data fetches.
 */
export async function mcpCall(toolName, args = {}) {
  try {
    return await callTool(toolName, args);
  } catch (err) {
    if (err.message?.includes('Unauthorized') || err.message?.includes('401')) {
      clearTokens();
    }
    throw err;
  }
}

/**
 * Check if user has stored OAuth tokens.
 */
export function isMcpConnected() {
  return localStorage.getItem(STORAGE.tokens) !== null;
}

/**
 * Clear all auth state.
 */
export function clearTokens() {
  Object.values(STORAGE).forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  mcpClient = null;
  mcpTransport = null;
}
