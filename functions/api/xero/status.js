/**
 * Xero connection status — checks if tokens exist in KV.
 */
export async function onRequest(context) {
  const { env } = context;

  const accessToken = await env.XERO_TOKENS.get('access_token');
  const tenantName = await env.XERO_TOKENS.get('tenant_name');
  const tokenExpiry = await env.XERO_TOKENS.get('token_expiry');

  const connected = !!accessToken;

  return new Response(JSON.stringify({
    connected,
    tenantName: tenantName || null,
    tokenExpiry: tokenExpiry || null
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
