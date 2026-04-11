/**
 * Xero Invoices proxy — fetches invoices from Xero API.
 * Supports optional filtering by contact name.
 *
 * Query params:
 *   ?contact=Acme Ltd     — filter by contact name
 *   ?page=1               — pagination (100 per page)
 *   ?status=AUTHORISED,PAID — filter by status
 */
import { xeroGet, jsonError } from './_helpers.js';

export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  try {
    const params = {};
    const contact = url.searchParams.get('contact');
    const page = url.searchParams.get('page');
    const status = url.searchParams.get('status');

    // Build where clause
    const whereParts = [];
    if (contact) {
      whereParts.push('Contact.Name=="' + contact + '"');
    }
    if (whereParts.length > 0) {
      params.where = whereParts.join(' AND ');
    }

    if (page) params.page = page;
    if (status) params.Statuses = status;

    params.order = 'Date DESC';

    const data = await xeroGet(env, '/Invoices', params);

    // Return simplified invoice data
    const invoices = (data.Invoices || []).map(inv => ({
      invoiceId: inv.InvoiceID,
      invoiceNumber: inv.InvoiceNumber,
      type: inv.Type,
      contact: inv.Contact ? inv.Contact.Name : '',
      contactId: inv.Contact ? inv.Contact.ContactID : '',
      date: inv.DateString,
      dueDate: inv.DueDateString,
      status: inv.Status,
      subtotal: inv.SubTotal,
      tax: inv.TotalTax,
      total: inv.Total,
      amountDue: inv.AmountDue,
      amountPaid: inv.AmountPaid,
      currency: inv.CurrencyCode,
      reference: inv.Reference || ''
    }));

    return new Response(JSON.stringify({ invoices }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return jsonError(err.message, err.message.includes('not connected') ? 401 : 500);
  }
}
