import { TicketError, validateOrder, buildTickets, renderTicketEmail } from './tickets.mjs';
import { renderTicketsPdf, pdfAttachment } from './pdf.mjs';

export function createTicketHandler({ env, createClient, catalog, fetch: sendRequest = fetch, renderPdf = renderTicketsPdf }) {
  return async (request) => {
    const origin = request.headers.get('origin');
    const allowed = ['http://localhost:5500', 'http://127.0.0.1:5500',
      ...(env('ALLOWED_ORIGINS') || '').split(',').map((value) => value.trim()).filter(Boolean)];
    const headers = {
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '600',
      'Vary': 'Origin', 'Cache-Control': 'no-store',
    };
    if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (data, status = 200) => Response.json(data, { status, headers });
    const storageFailure = (error, stage) => reply({
      code: 'ticket_storage_unavailable', stage,
      database_code: /^[A-Z0-9]{5,16}$/.test(error?.code || '') ? error.code : 'unknown',
    }, 503);
    if (origin && !allowed.includes(origin)) return reply({ code: 'origin_denied' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply({ code: 'method_not_allowed' }, 405);
    const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) return reply({ code: 'auth_required' }, 401);
    const url = env('SUPABASE_URL');
    const key = env('SUPABASE_SERVICE_ROLE_KEY');
    const resendKey = env('RESEND_API_KEY');
    const sender = env('TICKETS_FROM_EMAIL');
    if (!url || !key) return reply({ code: 'server_not_configured' }, 503);
    if (!resendKey || !sender) {
      const missing = [!resendKey && 'RESEND_API_KEY', !sender && 'TICKETS_FROM_EMAIL'].filter(Boolean);
      return reply({ code: 'email_not_configured', missing }, 503);
    }
    try {
      const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      // Never trust a client-supplied address or decode a token without verification.
      const { data: { user }, error: authError } = await admin.auth.getUser(token);
      if (authError || !user?.id || !user.email || !user.email_confirmed_at) return reply({ code: 'auth_required' }, 401);
      if (!request.headers.get('content-type')?.includes('application/json')) return reply({ code: 'invalid_order' }, 400);
      if (Number(request.headers.get('content-length')) > 16384) return reply({ code: 'invalid_order' }, 413);
      const raw = await request.text();
      if (raw.length > 16384) return reply({ code: 'invalid_order' }, 413);
      let input;
      try { input = JSON.parse(raw); } catch { return reply({ code: 'invalid_order' }, 400); }
      const order = validateOrder(input, catalog);
      const tickets = await buildTickets(order, user.id, catalog);
      const { data: job, error: jobError } = await admin.rpc('claim_ticket_email', {
        p_user_id: user.id, p_request_id: order.requestId,
        p_fingerprint: JSON.stringify([order.movieId, order.seats]), p_recipient: user.email, p_tickets: tickets,
      });
      if (jobError || !job) return storageFailure(jobError, 'claim');
      if (job.error) return reply({ code: job.error }, job.error === 'rate_limit' || job.error === 'in_progress' ? 429 : 409);
      if (job.accepted) return reply({ accepted: true, tickets: job.tickets });
      const email = renderTicketEmail(job.tickets);
      let attachment;
      try { attachment = pdfAttachment(await renderPdf(job.tickets), order.requestId); }
      catch { return reply({ code: 'pdf_generation_failed' }, 503); }
      const response = await sendRequest('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json',
          'Idempotency-Key': `tickets/${user.id}/${order.requestId}` },
        body: JSON.stringify({ from: sender, to: [job.recipient], subject: 'Ваші демонстраційні квитки — КАДР', ...email, attachments: [attachment] }),
      });
      if (!response.ok) return reply({ code: 'send_failed' }, 502);
      const result = await response.json();
      if (typeof result.id !== 'string' || !result.id) return reply({ code: 'send_failed' }, 502);
      const { error: savedError } = await admin.from('ticket_email_jobs')
        .update({ accepted_at: new Date().toISOString(), provider_id: result.id })
        .eq('user_id', user.id).eq('request_id', order.requestId).select('request_id').single();
      if (savedError) return storageFailure(savedError, 'save');
      return reply({ accepted: true, tickets: job.tickets });
    } catch (error) {
      if (error instanceof TicketError) return reply({ code: error.code }, error.status);
      return reply({ code: 'send_failed' }, 502);
    }
  };
}
