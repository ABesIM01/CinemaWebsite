import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateOrder, buildTickets, ticketFields, renderTicketEmail } from '../supabase/functions/send-tickets/tickets.mjs';
import { createTicketHandler } from '../supabase/functions/send-tickets/handler.mjs';
const catalog = JSON.parse(readFileSync('supabase/functions/send-tickets/catalog.json', 'utf8'));
const requestId = 'd9e57fa0-f4b2-4bc6-a870-d9bfc0d90d90';
const input = { requestId, movieId: 'dune', seats: ['r1-s1', 'r7-s2'] };
const user = { id: 'user-123', email: 'viewer@example.com', email_confirmed_at: '2026-10-10' };

function setup({ verifiedUser = user, authError = null, providerFailure = false, dbFailure = false, saveFailure = false, config = {}, pdfFailure = false } = {}) {
  const calls = [];
  let job;
  const variables = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-only', RESEND_API_KEY: 'server-email-key', TICKETS_FROM_EMAIL: 'KADR <tickets@example.com>', ALLOWED_ORIGINS: 'http://localhost:5500', ...config };
  const handler = createTicketHandler({
    env: (name) => variables[name], catalog,
    async renderPdf() {
      if (pdfFailure) throw new Error('PDF failed');
      return new TextEncoder().encode('%PDF-1.7\nmock PDF');
    },
    createClient() {
      return {
        auth: { async getUser(token) { calls.push(['auth', token]); return { data: { user: verifiedUser }, error: authError }; } },
        async rpc(_name, args) {
          calls.push(['claim', args]);
          if (dbFailure) return { error: Object.assign(new Error('database missing'), { code: typeof dbFailure === 'string' ? dbFailure : undefined }) };
          if (!job) job = { accepted: false, tickets: args.p_tickets, recipient: args.p_recipient };
          return { data: job };
        },
        from() {
          const query = {
            update(value) { calls.push(['save', value]); return query; },
            eq() { return query; }, select() { return query; },
            async single() { if (!saveFailure) job.accepted = true; return { error: saveFailure ? new Error('save failed') : null }; },
          };
          return query;
        },
      };
    },
    async fetch(_url, options) {
      calls.push(['email', options]);
      return Response.json(providerFailure ? { message: 'Rejected' } : { id: 'email-123' }, { status: providerFailure ? 500 : 200 });
    },
  });
  return { calls, handler, async send(body = input, headers = {}) {
    return handler(new Request('https://test.supabase.co/functions/v1/send-tickets', {
      method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:5500', authorization: 'Bearer user-token', ...headers }, body: JSON.stringify(body),
    }));
  } };
}

test('each seat gets a unique ticket in the requested field order', async () => {
  const tickets = await buildTickets(validateOrder(input, catalog), user.id, catalog);
  assert.equal(tickets.length, 2);
  assert.notEqual(tickets[0].number, tickets[1].number);
  assert.deepEqual(ticketFields(tickets[0]).map(([label]) => label), ['Номер квитка', 'Номер місця', 'Вартість', 'Назва сеансу', 'Тривалість']);
  assert.equal(tickets[0].price, 220);
  assert.equal(tickets[1].price, 320);
  assert.equal(tickets[0].durationMinutes, 166);
  assert.equal(tickets[0].sessionName, 'Дюна: Частина друга · 18:30');
  assert.deepEqual(await buildTickets(validateOrder(input, catalog), user.id, catalog), tickets);
});

test('invalid movie, occupied seat, duplicate seat and invalid request IDs are rejected', () => {
  for (const order of [null, { ...input, movieId: '__proto__' }, { ...input, seats: ['r1-s2'] }, { ...input, seats: ['r1-s1', 'r1-s1'] }, { ...input, seats: [] }, { ...input, requestId: 'bad' }]) assert.throws(() => validateOrder(order, catalog));
});

test('Interstellar VIP order accepts the reported seat when the null legend entry is removed', () => {
  const order = { requestId: 'cba8db5b-b003-4e87-af36-738de472f8ef', movieId: 'interstellar', seats: ['r8-s2', null] };
  assert.throws(() => validateOrder(order, catalog), { code: 'invalid_seat' });
  assert.deepEqual(validateOrder({ ...order, seats: ['r8-s2'] }, catalog).seats, ['r8-s2']);
});

test('email escapes HTML and includes all fields in both HTML and plain text', () => {
  const email = renderTicketEmail([{ number: 'KADR-1', seat: 'Ряд 1, місце 1', price: 220, sessionName: '<script>alert(1)</script>', durationMinutes: 166 }]);
  assert.ok(!email.html.includes('<script>'));
  assert.ok(email.html.includes('&lt;script&gt;'));
  let previous = -1;
  for (const label of ['Номер квитка', 'Номер місця', 'Вартість', 'Назва сеансу', 'Тривалість']) {
    const at = email.html.indexOf(label);
    assert.ok(at > previous);
    previous = at;
    assert.ok(email.text.includes(label));
  }
  assert.ok(email.text.includes('місця не заброньовано'));
});

test('verifies token, uses account email and server prices instead of client data', async () => {
  const service = setup();
  const response = await service.send({ ...input, email: 'attacker@example.com', price: 1, durationMinutes: 1 });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.accepted, true);
  const email = JSON.parse(service.calls.find(([type]) => type === 'email')[1].body);
  assert.deepEqual(email.to, [user.email]);
  assert.ok(email.text.includes('220 ₴'));
  assert.ok(email.text.includes('166 хв'));
  assert.equal(service.calls[0][0], 'auth');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5500');
});

test('missing, invalid and unconfirmed authentication never sends email', async () => {
  const missing = setup();
  assert.equal((await missing.send(input, { authorization: '' })).status, 401);
  for (const options of [{ verifiedUser: null }, { authError: new Error('invalid token') }, { verifiedUser: { ...user, email_confirmed_at: null } }]) {
    const service = setup(options);
    assert.equal((await service.send()).status, 401);
    assert.equal(service.calls.some(([type]) => type === 'email'), false);
  }
});

test('saved accepted request returns same tickets without sending a duplicate email', async () => {
  const service = setup();
  const first = await (await service.send()).json();
  const retry = await (await service.send()).json();
  assert.deepEqual(retry.tickets, first.tickets);
  assert.equal(service.calls.filter(([type]) => type === 'email').length, 1);
});

test('provider failure is never reported as success', async () => {
  const service = setup({ providerFailure: true });
  const response = await service.send();
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, 'send_failed');
  assert.equal(service.calls.some(([type]) => type === 'save'), false);
});

test('email includes the base64 PDF attachment with a stable filename', async () => {
  const service = setup();
  assert.equal((await service.send()).status, 200);
  const email = JSON.parse(service.calls.find(([type]) => type === 'email')[1].body);
  assert.equal(email.attachments.length, 1);
  assert.equal(email.attachments[0].filename, `kadr-tickets-${requestId}.pdf`);
  assert.equal(email.attachments[0].content_type, 'application/pdf');
  assert.ok(Buffer.from(email.attachments[0].content, 'base64').toString().startsWith('%PDF-'));
});

test('PDF generation failure prevents sending an email without the promised attachment', async () => {
  const service = setup({ pdfFailure: true });
  const response = await service.send();
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'pdf_generation_failed');
  assert.equal(service.calls.some(([type]) => type === 'email'), false);
});

test('retry after a persistence failure uses the same email idempotency key and body', async () => {
  const service = setup({ saveFailure: true });
  assert.equal((await service.send()).status, 503);
  await service.send();
  const emails = service.calls.filter(([type]) => type === 'email').map(([, options]) => options);
  assert.equal(emails[0].headers['Idempotency-Key'], emails[1].headers['Idempotency-Key']);
  assert.equal(emails[0].body, emails[1].body);
});

test('missing configuration or database blocks sending', async () => {
  for (const [options, code] of [[{ config: { RESEND_API_KEY: '' } }, 'email_not_configured'], [{ dbFailure: true }, 'ticket_storage_unavailable'], [{ config: { SUPABASE_SERVICE_ROLE_KEY: '' } }, 'server_not_configured']]) {
    const service = setup(options);
    const response = await service.send();
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, code);
    assert.equal(service.calls.some(([type]) => type === 'email'), false);
  }
});

test('missing email settings identify the required names without exposing secret values', async () => {
  const service = setup({ config: { RESEND_API_KEY: '', TICKETS_FROM_EMAIL: '' } });
  const response = await service.send();
  const body = await response.json();
  assert.equal(body.code, 'email_not_configured');
  assert.deepEqual(body.missing, ['RESEND_API_KEY', 'TICKETS_FROM_EMAIL']);
  assert.ok(!JSON.stringify(body).includes('server-only'));
  assert.equal(service.calls.length, 0);
});

test('storage failure identifies the stage and database code without exposing error text', async () => {
  const service = setup({ dbFailure: 'PGRST202' });
  const response = await service.send();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { code: 'ticket_storage_unavailable', stage: 'claim', database_code: 'PGRST202' });
  assert.equal(service.calls.some(([type]) => type === 'email'), false);
});

test('rejects unknown origins and supports CORS preflight without emailing', async () => {
  const service = setup();
  assert.equal((await service.send(input, { origin: 'https://unknown.example' })).status, 403);
  const response = await service.handler(new Request('https://test.example', { method: 'OPTIONS', headers: { origin: 'http://localhost:5500' } }));
  assert.equal(response.status, 204);
  assert.equal(service.calls.length, 0);
});

test('Live Server preflight works for 127.0.0.1 without email secrets or configured origins', async () => {
  const service = setup({ config: { ALLOWED_ORIGINS: '', RESEND_API_KEY: '' } });
  const response = await service.handler(new Request('https://test.example', {
    method: 'OPTIONS', headers: { origin: 'http://127.0.0.1:5500', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,apikey,content-type,x-client-info' },
  }));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'http://127.0.0.1:5500');
  assert.ok(response.headers.get('Access-Control-Allow-Headers').includes('content-type'));
  assert.equal(service.calls.length, 0);
  const unavailable = await service.send(input, { origin: 'http://127.0.0.1:5500' });
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('Access-Control-Allow-Origin'), 'http://127.0.0.1:5500');
});

test('ticket catalog matches movie pages, durations and available seat prices', () => {
  for (const [id, movie] of Object.entries(catalog)) {
    const html = readFileSync(`pages/movies/${id}.html`, 'utf8');
    assert.ok(html.includes(`<h1 id="movie-title">${movie.title}</h1>`));
    assert.ok(html.includes(`<dt>Тривалість</dt><dd>${movie.durationMinutes} хв`));
    assert.ok(html.includes(`<time>${movie.time}</time>`));
    for (const [seatId, seat] of Object.entries(movie.seats)) {
      const button = [...html.matchAll(/<button[^>]+data-seat-id="([^"]+)"[^>]*>/g)].find((match) => match[1] === seatId)[0];
      assert.ok(button.includes(`data-price="${seat.price}"`));
      assert.ok(button.includes(`data-seat-label="${seat.label}"`));
      assert.ok(!button.includes(' disabled'));
    }
  }
});
