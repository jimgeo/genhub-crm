/**
 * Xero OAuth 2.0 — Callback handler.
 * Exchanges authorization code for tokens, stores in KV,
 * fetches tenant ID, then redirects to admin page.
 */
export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Handle Xero denial
  if (error) {
    return Response.redirect(url.origin + '/admin.html?xero=denied', 302);
  }

  if (!code || !state) {
    return Response.redirect(url.origin + '/admin.html?xero=error', 302);
  }

  // Validate state parameter
  const storedState = await env.XERO_TOKENS.get('oauth_state');
  if (!storedState || storedState !== state) {
    return Response.redirect(url.origin + '/admin.html?xero=invalid_state', 302);
  }

  // Clean up state
  await env.XERO_TOKENS.delete('oauth_state');

  const redirectUri = url.origin + '/api/xero/callback';

  // Exchange code for tokens
  const tokenResp = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: env.XERO_CLIENT_ID,
      client_secret: env.XERO_CLIENT_SECRET
    }).toString()
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    console.error('Xero token exchange failed:', errText);
    return Response.redirect(url.origin + '/admin.html?xero=token_error', 302);
  }

  const tokens = await tokenResp.json();

  // Calculate expiry time
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Store tokens in KV
  await env.XERO_TOKENS.put('access_token', tokens.access_token);
  await env.XERO_TOKENS.put('refresh_token', tokens.refresh_token);
  await env.XERO_TOKENS.put('token_expiry', expiresAt);

  // Fetch tenant (organisation) connections
  const connectionsResp = await fetch('https://api.xero.com/connections', {
    headers: {
      'Authorization': 'Bearer ' + tokens.access_token,
      'Content-Type': 'application/json'
    }
  });

  if (connectionsResp.ok) {
    const connections = await connectionsResp.json();
    if (connections.length > 0) {
      // Use the first connected tenant
      await env.XERO_TOKENS.put('tenant_id', connections[0].tenantId);
      await env.XERO_TOKENS.put('tenant_name', connections[0].tenantName || '');
    }
  }

  return Response.redirect(url.origin + '/admin.html?xero=connected', 302);
}
