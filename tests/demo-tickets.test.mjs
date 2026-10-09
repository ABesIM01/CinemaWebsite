import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { generateDemoTickets } from '../assets/js/demo-tickets.mjs';

test('local browser libraries generate a real multi-page PDF using only the static catalog', async (context) => {
  const requests = [];
  context.mock.method(globalThis, 'fetch', async (url) => {
    requests.push(String(url));
    assert.match(String(url), /\/supabase\/functions\/send-tickets\/catalog\.json$/);
    return new Response(await readFile(url), { status: 200 });
  });
  const order = { requestId: 'cba8db5b-b003-4e87-af36-738de472f8ef', movieId: 'interstellar', seats: ['r1-s1', 'r8-s2'] };
  const result = await generateDemoTickets(order);
  assert.equal(result.tickets.length, 2);
  assert.equal(result.tickets[1].price, 350);
  assert.match(result.tickets[0].sessionName, /Інтерстеллар/);
  assert.match(result.tickets[1].seat, /Ряд 8, місце 2/);
  assert.equal((await PDFDocument.load(result.bytes)).getPageCount(), 2);
  const retry = await generateDemoTickets(order);
  assert.deepEqual(retry.bytes, result.bytes);
  await assert.rejects(generateDemoTickets({ ...order, seats: ['r8-s2', null] }), { code: 'invalid_seat' });
  assert.equal(requests.length, 1);
});
