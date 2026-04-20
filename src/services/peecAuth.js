/**
 * Peec AI OAuth 2.0 PKCE Authentication Module
 * 
 * Discovered endpoints from https://api.peec.ai/mcp/.well-known/oauth-authorization-server:
 *   authorization_endpoint: https://api.peec.ai/authorize
 *   token_endpoint:         https://api.peec.ai/token
 *   revocation_endpoint:    https://api.peec.ai/revoke
 *   code_challenge_method:  S256
 *   token_auth_method:      none (public client, PKCE only)
 */

const AUTH_ENDPOINT = 'https://api.peec.ai/authorize';
const TOKEN_ENDPOINT = 'https://api.peec.ai/token';
const REDIRECT_URI = `${window.location.origin}/callback`;

const STORAGE_KEYS = {
  accessToken: 'peec_access_token',
  refreshToken: 'peec_refresh_token',
  expiresAt: 'peec_expires_at',
  codeVerifier: 'peec_code_verifier',
  clientId: 'peec_client_id',
};

// --- PKCE Helpers ---

function generateRandomString(length = 64) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

function base64UrlEncode(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

async function generatePKCEPair() {
  const verifier = generateRandomString(64);
  const hash = await sha256(verifier);
  const challenge = base64UrlEncode(new Uint8Array(hash));
  return { verifier, challenge };
}

// --- Dynamic Client Registration ---

async function getOrRegisterClientId() {
  const stored = localStorage.getItem(STORAGE_KEYS.clientId);
  if (stored) return stored;

  try {
    const res = await fetch('https://api.peec.ai/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'BrandPulse AI',
        redirect_uris: [REDIRECT_URI],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.client_id) {
        localStorage.setItem(STORAGE_KEYS.clientId, data.client_id);
        return data.client_id;
      }
    }
  } catch (e) {
    console.warn('Dynamic client registration failed, using default client_id');
  }

  // Fallback: some MCP OAuth servers accept any client_id for public clients
  // The server will assign one on first auth if needed
  return 'brandpulse-ai';
}

// --- Token Management ---

export function getStoredTokens() {
  const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
  const expiresAt = localStorage.getItem(STORAGE_KEYS.expiresAt);
  
  if (!accessToken) return null;
  return { accessToken, refreshToken, expiresAt: Number(expiresAt) };
}

export function storeTokens({ access_token, refresh_token, expires_in }) {
  localStorage.setItem(STORAGE_KEYS.accessToken, access_token);
  if (refresh_token) {
    localStorage.setItem(STORAGE_KEYS.refreshToken, refresh_token);
  }
  const expiresAt = Date.now() + (expires_in || 3600) * 1000;
  localStorage.setItem(STORAGE_KEYS.expiresAt, String(expiresAt));
}

export function clearTokens() {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
}

export function isTokenExpired() {
  const tokens = getStoredTokens();
  if (!tokens) return true;
  // Treat as expired if within 60s of expiry
  return Date.now() > tokens.expiresAt - 60_000;
}

// --- Auth Flow ---

export async function startPeecAuth() {
  const clientId = await getOrRegisterClientId();
  const { verifier, challenge } = await generatePKCEPair();

  // Store verifier in sessionStorage (survives redirect, cleared on tab close)
  sessionStorage.setItem(STORAGE_KEYS.codeVerifier, verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: 'mcp:tools',
  });

  // Redirect the user to the Peec authorization page
  window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`;
}

export async function handlePeecCallback(code) {
  const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.codeVerifier);
  if (!codeVerifier) {
    throw new Error('Missing PKCE code verifier. Please restart the auth flow.');
  }

  const clientId = await getOrRegisterClientId();

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: codeVerifier,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${err}`);
  }

  const tokens = await res.json();
  storeTokens(tokens);
  sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
  
  return tokens;
}

export async function refreshAccessToken() {
  const tokens = getStoredTokens();
  if (!tokens?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const clientId = await getOrRegisterClientId();

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: clientId,
    }),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error('Token refresh failed, please re-authenticate');
  }

  const newTokens = await res.json();
  storeTokens(newTokens);
  return newTokens;
}

/** Get a valid access token, refreshing if needed */
export async function getValidAccessToken() {
  if (isTokenExpired()) {
    const tokens = getStoredTokens();
    if (tokens?.refreshToken) {
      const refreshed = await refreshAccessToken();
      return refreshed.access_token;
    }
    throw new Error('Token expired and no refresh token available');
  }
  return getStoredTokens().accessToken;
}
