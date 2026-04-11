/**
 * Shared helpers for Xero API Worker Functions.
 * Handles token refresh and authenticated requests.
 */

/**
 * Get a valid access token, refreshing if expired.
 * Returns { accessToken, tenantId } or throws.
 */
export async function getXeroAuth(env) {
  let accessToken = await env.XERO_TOKENS.get('access_token');
  const refreshToken = await env.XERO_TOKENS.get('refresh_token');
  const tenantId = await env.XERO_TOKENS.get('tenant_id');
  const tokenExpiry = await env.XERO_TOKENS.get('token_expiry');

  if (!accessToken || !refreshToken) {
    throw new Error('Xero not connected');
  }

  // Refresh if expired or expiring within 2 minutes
  const expiresAt = tokenExpiry ? new Date(tokenExpiry) : new Date(0);
  if (Date.now() > expiresAt.getTime() - 120000) {
    const refreshResp = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.XERO_CLIENT_ID,
        client_secret: env.XERO_CLIENT_SECRET
      }).toString()
    });

    if (!refreshResp.ok) {
      // Clear stale tokens
      await env.XERO_TOKENS.delete('access_token');
      await env.XERO_TOKENS.delete('refresh_token');
      await env.XERO_TOKENS.delete('token_expiry');
      throw new Error('Token refresh failed — reconnect to Xero');
    }

    const tokens = await refreshResp.json();
    accessToken = tokens.access_token;
    const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await env.XERO_TOKENS.put('access_token', tokens.access_token);
    await env.XERO_TOKENS.put('refresh_token', tokens.refresh_token);
    await env.XERO_TOKENS.put('token_expiry', newExpiry);
  }

  return { accessToken, tenantId };
}

/**
 * Make an authenticated GET request to the Xero API.
 */
export async function xeroGet(env, path, params) {
  const { accessToken, tenantId } = await getXeroAuth(env);

  const url = new URL('https://api.xero.com/api.xro/2.0' + path);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const resp = await fetch(url.toString(), {
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Xero-Tenant-Id': tenantId,
      'Accept': 'application/json'
    }
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error('Xero API error ' + resp.status + ': ' + errText);
  }

  return resp.json();
}

/**
 * Return a JSON error response.
 */
export function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status: status || 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
