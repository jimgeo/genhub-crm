export async function onRequest(context) {
  const { env } = context;
  return new Response(JSON.stringify({
    API_KEY: env.API_KEY,
    SPREADSHEET_ID: env.SPREADSHEET_ID,
    WRITE_PROXY_URL: env.WRITE_PROXY_URL,
    XERO_CLIENT_ID: env.XERO_CLIENT_ID || null,
    LOGO_DEV_TOKEN: env.LOGO_DEV_TOKEN || null,
    HAS_COMPANIES_HOUSE: !!env.COMPANIES_HOUSE_API_KEY
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
