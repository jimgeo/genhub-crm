export async function onRequest(context) {
  const { env } = context;
  return new Response(JSON.stringify({
    API_KEY: env.API_KEY,
    SPREADSHEET_ID: env.SPREADSHEET_ID,
    WRITE_PROXY_URL: env.WRITE_PROXY_URL
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
