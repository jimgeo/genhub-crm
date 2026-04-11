/**
 * Xero Contacts proxy — fetches contacts from Xero API.
 * Used for matching Xero contacts to CRM accounts.
 *
 * Query params:
 *   ?search=Acme    — search by name
 *   ?page=1         — pagination (100 per page)
 */
import { xeroGet, jsonError } from './_helpers.js';

export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  try {
    const params = {};
    const search = url.searchParams.get('search');
    const page = url.searchParams.get('page');

    if (search) {
      params.where = 'Name.Contains("' + search + '")';
    }
    if (page) params.page = page;

    params.order = 'Name ASC';

    const data = await xeroGet(env, '/Contacts', params);

    const contacts = (data.Contacts || []).map(c => ({
      contactId: c.ContactID,
      name: c.Name,
      email: c.EmailAddress || '',
      phone: c.Phones && c.Phones.length > 0
        ? c.Phones.find(p => p.PhoneNumber)?.PhoneNumber || ''
        : '',
      isCustomer: c.IsCustomer,
      isSupplier: c.IsSupplier
    }));

    return new Response(JSON.stringify({ contacts }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return jsonError(err.message, err.message.includes('not connected') ? 401 : 500);
  }
}
