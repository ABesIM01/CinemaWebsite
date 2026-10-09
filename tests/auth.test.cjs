const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/auth.js', 'utf8');

// Exercise the UI against a simulated provider; real email and OAuth require credentials.
async function setup({ configured = true, initialSession = null, url = 'https://cinema.example/pages/register.html', sdkFailure = false, registration = true } = {}) {
  const elements = new Map();
  function element() {
    return {
      value: '', hidden: false, disabled: false, dataset: {}, textContent: '', handlers: {},
      addEventListener(type, handler) { this.handlers[type] = handler; },
      reportValidity() { return true; }, reset() { this.value = ''; }, focus() {},
      replaceWith(next) { elements.set('.settings-registration', next); },
    };
  }
  for (const key of ['#registration-email-form', '#registration-code-form', '#registration-contact', '#registration-code', '#registration-resend', '.registration-google', '#registration-methods', '#registration-account', '#registration-account-email', '#registration-email', '#registration-alternatives', '#registration-change', '#registration-logout', '#registration-note', '.settings-registration']) elements.set(key, element());
  elements.set('.settings-auth-status', element());
  if (!registration) for (const key of [...elements.keys()]) if (key.startsWith('#registration') || key === '.registration-google') elements.delete(key);
  const calls = [];
  const failures = {};
  let subscriber;
  const session = { user: { email: 'viewer@example.com' } };
  const auth = {
    onAuthStateChange(fn) { subscriber = fn; },
    async getSession() { return { data: { session: initialSession }, error: null }; },
    async signInWithOtp(args) { calls.push(['send', args]); return { error: failures.send }; },
    async verifyOtp(args) {
      calls.push(['verify', args]);
      if (failures.verify) return { error: failures.verify };
      subscriber('SIGNED_IN', session);
      initialSession = session;
      return { data: { session }, error: null };
    },
    async signOut(args) {
      calls.push(['logout', args]);
      if (!failures.logout) { initialSession = null; subscriber('SIGNED_OUT', null); }
      return { error: failures.logout };
    },
    async signInWithOAuth(args) { calls.push(['google', args]); return { error: failures.google }; },
    async exchangeCodeForSession(code) { calls.push(['exchange', code]); initialSession = session; return { error: failures.exchange }; },
  };
  const document = {
    currentScript: { src: 'https://cinema.example/assets/js/auth.js' },
    querySelector: (key) => elements.get(key),
    querySelectorAll: () => [...elements.values()].filter((el) => el !== elements.get('.settings-registration')),
    createElement: element,
    addEventListener() {},
    head: { append(script) { if (sdkFailure) script.onerror(); else script.onload(); } },
  };
  const window = {
    cinemaAuthConfig: configured ? { url: 'https://project.supabase.co', publishableKey: 'public-test-key' } : {},
    supabase: { createClient(_url, _key, options) {
      calls.push(['create', options]);
      return { auth, functions: { async invoke(name, args) {
        calls.push(['invoke', name, args]);
        return { data: { accepted: true, tickets: [{ number: 'KADR-test' }] }, error: failures.invoke };
      } } };
    } },
  };
  const context = { window, document, URL, URLSearchParams, location: new URL(url), history: { replaceState(...args) { calls.push(['history', args]); } }, setTimeout() { return 1; }, clearTimeout() {}, Date };
  vm.runInNewContext(source, context);
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  await flush();
  return {
    calls, failures, elements, session, api: window.cinemaAuth,
    get: (key) => elements.get(key),
    async event(key, type = 'click') { await elements.get(key).handlers[type]({ preventDefault() {} }); await flush(); },
    async state(value) { subscriber('SIGNED_IN', value); await flush(); },
  };
}

test('unconfigured provider disables authorization without creating a fake account', async () => {
  const ui = await setup({ configured: false });
  assert.equal(ui.calls.length, 0);
  assert.equal(ui.get('.registration-google').disabled, true);
  assert.match(ui.get('#registration-note').textContent, /недоступний/);
  assert.equal(ui.get('.settings-registration').href, 'https://cinema.example/pages/register.html');
});

test('email code is sent, verified and signed out; sending alone never signs in', async () => {
  const ui = await setup();
  ui.get('#registration-contact').value = ' viewer@example.com ';
  await ui.event('#registration-email-form', 'submit');
  assert.equal(ui.calls.find(([name]) => name === 'send')[1].email, 'viewer@example.com');
  assert.equal(ui.get('#registration-code-form').hidden, false);
  assert.equal(ui.get('#registration-account').hidden, true);
  assert.equal(ui.get('#registration-resend').disabled, true);
  await ui.event('#registration-resend');
  assert.equal(ui.calls.filter(([name]) => name === 'send').length, 1);
  ui.get('#registration-code').value = '123456';
  await ui.event('#registration-code-form', 'submit');
  const verification = ui.calls.find(([name]) => name === 'verify')[1];
  assert.equal(verification.type, 'email');
  assert.equal(verification.token, '123456');
  assert.equal(ui.get('#registration-account-email').textContent, 'viewer@example.com');
  assert.equal(ui.get('.settings-registration').textContent, 'Вийти з акаунта');
  await ui.event('.settings-registration');
  assert.equal(ui.get('#registration-account').hidden, true);
  assert.equal(ui.get('.settings-registration').textContent, 'Реєстрація');
  assert.equal(ui.calls.find(([name]) => name === 'logout')[1].scope, 'local');
});

test('invalid code keeps user signed out and allows another attempt', async () => {
  const ui = await setup();
  ui.get('#registration-contact').value = 'viewer@example.com';
  await ui.event('#registration-email-form', 'submit');
  ui.failures.verify = { code: 'otp_expired' };
  ui.get('#registration-code').value = '000000';
  await ui.event('#registration-code-form', 'submit');
  assert.equal(ui.get('#registration-note').dataset.error, 'true');
  assert.match(ui.get('#registration-note').textContent, /неправильний/);
  assert.equal(ui.get('#registration-account').hidden, true);
  assert.equal(ui.get('#registration-code').disabled, false);
});

test('send failure and provider rate limit leave email form available', async () => {
  const ui = await setup();
  ui.failures.send = { status: 429 };
  ui.get('#registration-contact').value = 'viewer@example.com';
  await ui.event('#registration-email-form', 'submit');
  assert.equal(ui.get('#registration-email-form').hidden, false);
  assert.match(ui.get('#registration-note').textContent, /Забагато/);
  assert.equal(ui.get('#registration-contact').disabled, false);
});

test('restores existing session and tracks provider events from other tabs', async () => {
  const ui = await setup({ initialSession: { user: { email: 'saved@example.com' } } });
  assert.equal(ui.get('.settings-registration').textContent, 'Вийти з акаунта');
  assert.equal(ui.get('#registration-account-email').textContent, 'saved@example.com');
  await ui.state(null);
  assert.equal(ui.get('.settings-registration').textContent, 'Реєстрація');
});

test('logout failure retains signed-in UI', async () => {
  const ui = await setup({ initialSession: { user: { email: 'saved@example.com' } } });
  ui.failures.logout = { status: 500 };
  await ui.event('.settings-registration');
  assert.equal(ui.get('.settings-registration').textContent, 'Вийти з акаунта');
  assert.equal(ui.get('#registration-note').dataset.error, 'true');
});

test('movie and home pages also restore session and allow sign-out', async () => {
  const ui = await setup({ registration: false, initialSession: { user: { email: 'saved@example.com' } }, url: 'https://cinema.example/pages/movies/dune.html' });
  assert.equal(ui.get('.settings-registration').textContent, 'Вийти з акаунта');
  await ui.event('.settings-registration');
  assert.equal(ui.get('.settings-registration').href, 'https://cinema.example/pages/register.html');
  assert.match(ui.get('.settings-auth-status').textContent, /вийшли/);
});

test('Google uses the registration callback and PKCE, with code removed from URL', async () => {
  const ui = await setup();
  await ui.event('.registration-google');
  const options = ui.calls.find(([name]) => name === 'google')[1];
  assert.equal(options.provider, 'google');
  assert.equal(options.options.redirectTo, 'https://cinema.example/pages/register.html');
  assert.equal(ui.calls.find(([name]) => name === 'create')[1].auth.flowType, 'pkce');
  const callback = await setup({ url: 'https://cinema.example/pages/register.html?code=one-time-code' });
  assert.ok(callback.calls.find(([name]) => name === 'exchange'));
  assert.equal(callback.calls.find(([name]) => name === 'history')[1][2], 'https://cinema.example/pages/register.html');
  assert.equal(callback.get('.settings-registration').textContent, 'Вийти з акаунта');
});

test('Google cancellation and SDK failure show recoverable messages', async () => {
  const cancel = await setup({ url: 'https://cinema.example/pages/register.html?error=access_denied' });
  assert.match(cancel.get('#registration-note').textContent, /скасовано/);
  assert.equal(cancel.calls.filter(([name]) => name === 'exchange').length, 0);
  const failed = await setup({ sdkFailure: true });
  assert.equal(failed.get('.registration-google').disabled, true);
  assert.equal(failed.get('#registration-note').dataset.error, 'true');
});

test('ticket API requires a session and invokes authenticated Edge Function', async () => {
  const guest = await setup();
  await assert.rejects(guest.api.sendTicketEmail({}), { code: 'auth_required' });
  assert.equal(guest.calls.some(([name]) => name === 'invoke'), false);
  const user = await setup({ initialSession: { user: { email: 'saved@example.com' } } });
  const order = { movieId: 'dune', seats: ['r1-s1'], requestId: 'request' };
  const result = await user.api.sendTicketEmail(order);
  assert.equal(result.accepted, true);
  assert.equal(user.calls.find(([name]) => name === 'invoke')[1], 'send-tickets');
  assert.deepEqual(user.calls.find(([name]) => name === 'invoke')[2].body, order);
});

test('missing Edge Function and CORS network failure produce an actionable ticket error', async () => {
  const user = await setup({ initialSession: { user: { email: 'saved@example.com' } } });
  user.failures.invoke = Object.assign(new Error('Not found'), { context: { status: 404, json: async () => ({ code: 'NOT_FOUND' }) } });
  await assert.rejects(user.api.sendTicketEmail({}), { code: 'ticket_service_unavailable' });
  user.failures.invoke = Object.assign(new Error('Network failure'), { name: 'FunctionsFetchError' });
  await assert.rejects(user.api.sendTicketEmail({}), { code: 'ticket_service_unavailable' });
});
