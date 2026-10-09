const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/tickets.js', 'utf8');
const user = { user: { id: 'viewer', email: 'viewer@example.com' } };
const ticket = { number: 'KADR-123', seat: 'Ряд 1, місце 1', price: 220, sessionName: 'Дюна · 18:30', durationMinutes: 166 };

function setup({ session = user, deliver = async () => ({ accepted: true, tickets: [ticket] }) } = {}) {
  function element() {
    return { hidden: false, disabled: false, textContent: '', dataset: {}, children: [], handlers: {},
      addEventListener(type, fn) { this.handlers[type] = fn; },
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; },
    };
  }
  const selectors = Object.fromEntries(['.ticket-send', '.ticket-login', '.ticket-status', '.ticket-preview', '.hall-rows', '.ticket-payment-actions', '.hall-confirm-payment', '.ticket-email-actions'].map((name) => [name, element()]));
  let selected = [{ dataset: { seatId: 'r1-s1' } }];
  const legend = { dataset: {} };
  selectors['.hall-rows'].querySelectorAll = () => selected;
  const hall = { dataset: { movieId: 'dune' },
    querySelector(name) { return name.startsWith('.hall-payment') ? { querySelector: (key) => selectors[key] } : selectors[name]; },
    querySelectorAll() { return [...selected, legend]; },
  };
  let listener;
  let sequence = 0;
  const calls = [];
  const document = {
    currentScript: { src: 'https://cinema.example/assets/js/tickets.js' },
    querySelectorAll: () => [hall], createElement: element, addEventListener() {},
  };
  const auth = {
    subscribe(fn) { listener = fn; fn(session); },
    async sendTicketEmail(order) { calls.push(order); return deliver(order); },
  };
  vm.runInNewContext(source, { window: { cinemaAuth: auth }, document, URL, crypto: { randomUUID: () => `request-${++sequence}` } });
  return { calls, get: (name) => selectors[name],
    click: () => selectors['.ticket-send'].handlers.click(),
    pay: () => selectors['.hall-confirm-payment'].handlers.click(),
    state: (next) => listener(next),
    seats(ids) { selected = ids.map((id) => ({ dataset: { seatId: id } })); selectors['.hall-rows'].handlers.click(); },
  };
}

test('guests see sign-in, while only signed-in users can send tickets', async () => {
  const guest = setup({ session: null });
  assert.equal(guest.get('.ticket-send').hidden, true);
  assert.equal(guest.get('.ticket-login').href, 'https://cinema.example/pages/register.html');
  await guest.click();
  assert.equal(guest.calls.length, 0);
  guest.state(user);
  assert.equal(guest.get('.ticket-send').hidden, true);
  guest.pay();
  assert.equal(guest.get('.ticket-send').hidden, false);
  assert.equal(guest.get('.ticket-login').hidden, true);
});

test('successful send renders all five fields and prevents another click for the same selection', async () => {
  const ui = setup();
  assert.equal(ui.get('.ticket-email-actions').hidden, true);
  assert.equal(ui.get('.ticket-payment-actions').hidden, false);
  await ui.click();
  assert.equal(ui.calls.length, 0);
  ui.pay();
  assert.equal(ui.calls.length, 0);
  assert.equal(ui.get('.ticket-payment-actions').hidden, true);
  assert.equal(ui.get('.ticket-email-actions').hidden, false);
  await ui.click();
  const card = ui.get('.ticket-preview').children[0];
  assert.deepEqual(card.children.map((line) => line.children[0].textContent), ['Номер квитка: ', 'Номер місця: ', 'Вартість: ', 'Назва сеансу: ', 'Тривалість: ']);
  assert.equal(card.children[2].children[1].textContent, '220 ₴');
  assert.equal(ui.get('.ticket-send').disabled, true);
  await ui.click();
  assert.equal(ui.calls.length, 1);
  ui.seats(['r7-s2']);
  assert.equal(ui.get('.ticket-send').hidden, true);
  assert.equal(ui.get('.ticket-payment-actions').hidden, false);
  assert.equal(ui.get('.ticket-preview').children.length, 0);
});

test('failed delivery does not show a ticket and retry reuses the request ID', async () => {
  let attempt = 0;
  const ui = setup({ deliver: async () => { if (++attempt === 1) throw new Error('network failure'); return { accepted: true, tickets: [ticket] }; } });
  ui.pay();
  await ui.click();
  assert.equal(ui.get('.ticket-preview').children.length, 0);
  assert.equal(ui.get('.ticket-status').dataset.error, 'true');
  assert.equal(ui.get('.ticket-send').disabled, false);
  await ui.click();
  assert.equal(ui.calls[0].requestId, ui.calls[1].requestId);
  assert.equal(ui.get('.ticket-preview').children.length, 1);
});

test('logout during delivery clears ticket data and discards the late response', async () => {
  let resolve;
  const ui = setup({ deliver: () => new Promise((done) => { resolve = done; }) });
  ui.pay();
  const pending = ui.click();
  assert.equal(ui.get('.ticket-send').disabled, true);
  ui.state(null);
  resolve({ accepted: true, tickets: [ticket] });
  await pending;
  assert.equal(ui.get('.ticket-preview').children.length, 0);
  assert.equal(ui.get('.ticket-send').hidden, true);
});

test('expired authentication prompts sign-in again', async () => {
  const ui = setup({ deliver: async () => { throw Object.assign(new Error('expired'), { code: 'auth_required' }); } });
  ui.pay();
  await ui.click();
  assert.equal(ui.get('.ticket-send').hidden, true);
  assert.equal(ui.get('.ticket-login').hidden, false);
});

test('same seat selection preserves payment, while changed selection requires paying again', async () => {
  const ui = setup();
  ui.pay();
  ui.seats(['r1-s1']);
  assert.equal(ui.get('.ticket-email-actions').hidden, false);
  ui.seats(['r7-s2']);
  assert.equal(ui.get('.ticket-email-actions').hidden, true);
  await ui.click();
  assert.equal(ui.calls.length, 0);
  ui.pay();
  await ui.click();
  assert.equal(ui.calls.length, 1);
});

test('missing email function reports unavailability and preserves demo payment for retry', async () => {
  const ui = setup({ deliver: async () => { throw Object.assign(new Error('not deployed'), { code: 'ticket_service_unavailable' }); } });
  ui.pay();
  await ui.click();
  assert.match(ui.get('.ticket-status').textContent, /недоступне/);
  assert.equal(ui.get('.ticket-payment-actions').hidden, true);
  assert.equal(ui.get('.ticket-send').disabled, false);
});

test('selected-seat legend is excluded from orders and never becomes a null seat', async () => {
  const ui = setup();
  ui.seats(['r8-s2']);
  ui.pay();
  await ui.click();
  const payload = JSON.parse(JSON.stringify(ui.calls[0]));
  assert.deepEqual(payload.seats, ['r8-s2']);
});

test('selected-seat legend alone cannot enable payment or email without an actual seat', async () => {
  const ui = setup();
  ui.seats([]);
  assert.equal(ui.get('.hall-confirm-payment').disabled, true);
  ui.pay();
  await ui.click();
  assert.equal(ui.get('.ticket-email-actions').hidden, true);
  assert.equal(ui.calls.length, 0);
});
