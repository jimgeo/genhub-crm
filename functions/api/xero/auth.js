/**
 * Xero OAuth 2.0 — Initiate authorization flow.
 * Redirects user to Xero login with read-only scopes.
 */
export async function onRequest(context) {
  const { env } = context;
  const clientId = env.XERO_CLIENT_ID;

  if (!clientId) {
    return new Response(JSON.stringify({ error: 'XERO_CLIENT_ID not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Generate a random state parameter for CSRF protection
  const state = crypto.randomUUID();

  // Store state in KV with 10-minute TTL for validation in callback
  await env.XERO_TOKENS.put('oauth_state', state, { expirationTtl: 600 });

  const redirectUri = new URL('/api/xero/callback', context.request.url).origin + '/api/xero/callback';

  const scopes = [
    'openid',
    'profile',
    'email',
    'accounting.transactions.read',
    'accounting.contacts.read',
    'offline_access'
  ].join(' ');

  const authUrl = new URL('https://login.xero.com/identity/connect/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);

  return Response.redirect(authUrl.toString(), 302);
}
