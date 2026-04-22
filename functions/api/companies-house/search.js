/**
 * Companies House — search companies by name.
 * Uses basic auth (API key as username, empty password).
 *
 * Query params:
 *   ?q=Acme        — search query (required)
 *   ?items_per_page=10  — results per page (default 10)
 *   ?start_index=0      — pagination offset
 */
export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const apiKey = env.COMPANIES_HOUSE_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'COMPANIES_HOUSE_API_KEY not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  const q = url.searchParams.get('q');
  if (!q) {
    return new Response(JSON.stringify({ error: 'Missing q parameter' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const params = new URLSearchParams({ q });
    const itemsPerPage = url.searchParams.get('items_per_page');
    const startIndex = url.searchParams.get('start_index');
    if (itemsPerPage) params.set('items_per_page', itemsPerPage);
    if (startIndex) params.set('start_index', startIndex);

    const resp = await fetch('https://api.company-information.service.gov.uk/search/companies?' + params.toString(), {
      headers: {
        'Authorization': 'Basic ' + btoa(apiKey + ':')
      }
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: 'Companies House API error: ' + resp.status, detail: errText }), {
        status: resp.status, headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await resp.json();

    const companies = (data.items || []).map(c => ({
      companyNumber: c.company_number,
      name: c.title,
      status: c.company_status,
      type: c.company_type,
      dateOfCreation: c.date_of_creation,
      address: c.address_snippet || '',
      addressObj: c.address || {}
    }));

    return new Response(JSON.stringify({
      companies,
      totalResults: data.total_results || 0,
      startIndex: data.start_index || 0,
      itemsPerPage: data.items_per_page || 10
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
