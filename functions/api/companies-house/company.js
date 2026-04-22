/**
 * Companies House — get company profile, registered address, and officers.
 * Returns combined data in a single response.
 *
 * Query params:
 *   ?number=12345678  — company number (required)
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

  const companyNumber = url.searchParams.get('number');
  if (!companyNumber) {
    return new Response(JSON.stringify({ error: 'Missing number parameter' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const authHeader = 'Basic ' + btoa(apiKey + ':');
  const baseUrl = 'https://api.company-information.service.gov.uk';

  try {
    // Fetch profile, address, and officers in parallel
    const [profileResp, addressResp, officersResp] = await Promise.all([
      fetch(baseUrl + '/company/' + companyNumber, { headers: { 'Authorization': authHeader } }),
      fetch(baseUrl + '/company/' + companyNumber + '/registered-office-address', { headers: { 'Authorization': authHeader } }),
      fetch(baseUrl + '/company/' + companyNumber + '/officers', { headers: { 'Authorization': authHeader } })
    ]);

    // Profile
    let profile = null;
    if (profileResp.ok) {
      const p = await profileResp.json();
      profile = {
        companyNumber: p.company_number,
        name: p.company_name,
        status: p.company_status,
        type: p.type,
        dateOfCreation: p.date_of_creation,
        dateOfCessation: p.date_of_cessation || null,
        sicCodes: p.sic_codes || [],
        jurisdiction: p.jurisdiction || '',
        canFile: p.can_file,
        hasCharges: p.has_charges,
        hasInsolvencyHistory: p.has_insolvency_history,
        registeredOfficeIsInDispute: p.registered_office_is_in_dispute || false,
        lastAccounts: p.accounts ? {
          madeUpTo: p.accounts.last_accounts ? p.accounts.last_accounts.made_up_to : null,
          type: p.accounts.last_accounts ? p.accounts.last_accounts.type : null,
          nextDue: p.accounts.next_due || null
        } : null,
        confirmationStatement: p.confirmation_statement ? {
          lastMadeUpTo: p.confirmation_statement.last_made_up_to || null,
          nextDue: p.confirmation_statement.next_due || null
        } : null
      };
    }

    // Registered address
    let address = null;
    if (addressResp.ok) {
      const a = await addressResp.json();
      address = {
        line1: a.address_line_1 || '',
        line2: a.address_line_2 || '',
        locality: a.locality || '',
        region: a.region || '',
        postalCode: a.postal_code || '',
        country: a.country || '',
        poBox: a.po_box || ''
      };
    }

    // Officers
    let officers = [];
    if (officersResp.ok) {
      const o = await officersResp.json();
      officers = (o.items || []).map(off => ({
        name: off.name,
        role: off.officer_role,
        appointedOn: off.appointed_on || '',
        resignedOn: off.resigned_on || null,
        nationality: off.nationality || '',
        countryOfResidence: off.country_of_residence || '',
        occupation: off.occupation || '',
        address: off.address ? {
          line1: off.address.address_line_1 || '',
          line2: off.address.address_line_2 || '',
          locality: off.address.locality || '',
          region: off.address.region || '',
          postalCode: off.address.postal_code || '',
          country: off.address.country || ''
        } : null
      }));
    }

    return new Response(JSON.stringify({ profile, address, officers }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
