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

    const contacts = (data.Contacts || []).map(c => {
      // Extract street address if available
      const streetAddr = (c.Addresses || []).find(a => a.AddressType === 'STREET' && (a.AddressLine1 || a.City)) ||
                         (c.Addresses || []).find(a => a.AddressLine1 || a.City) || {};

      // Extract phone numbers by type
      const phones = c.Phones || [];
      const findPhone = (type) => {
        const p = phones.find(p => p.PhoneType === type && p.PhoneNumber);
        return p ? (p.PhoneCountryCode ? '+' + p.PhoneCountryCode + ' ' : '') + (p.PhoneAreaCode || '') + ' ' + p.PhoneNumber : '';
      };

      // Primary contact person (first one)
      const primary = (c.ContactPersons || []).find(p => p.IncludeInEmails) || (c.ContactPersons || [])[0] || {};

      return {
        contactId: c.ContactID,
        name: c.Name,
        accountNumber: c.AccountNumber || '',
        email: c.EmailAddress || '',
        website: c.Website || '',
        taxNumber: c.TaxNumber || '',
        companyNumber: c.CompanyNumber || '',
        phoneDefault: findPhone('DEFAULT').trim(),
        phoneMobile: findPhone('MOBILE').trim(),
        phoneDDI: findPhone('DDI').trim(),
        address: {
          line1: streetAddr.AddressLine1 || '',
          line2: streetAddr.AddressLine2 || '',
          city: streetAddr.City || '',
          region: streetAddr.Region || '',
          postalCode: streetAddr.PostalCode || '',
          country: streetAddr.Country || ''
        },
        primaryContact: {
          firstName: primary.FirstName || '',
          lastName: primary.LastName || '',
          email: primary.EmailAddress || ''
        },
        isCustomer: c.IsCustomer,
        isSupplier: c.IsSupplier,
        contactStatus: c.ContactStatus || ''
      };
    });

    return new Response(JSON.stringify({ contacts }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return jsonError(err.message, err.message.includes('not connected') ? 401 : 500);
  }
}
