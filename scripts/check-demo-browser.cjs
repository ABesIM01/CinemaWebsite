// Exercise the actual browser module graph through the local Live Server.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const browserPath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kadr-browser-'));
const origin = process.env.CINEMA_TEST_ORIGIN || 'http://127.0.0.1:5500';
const port = 9224;
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
(async () => {
  let page;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { page = await (await fetch(`http://127.0.0.1:${port}/json/new?${origin}/pages/movies/interstellar.html%23session-title`, { method: 'PUT' })).json(); break; }
    catch { await new Promise((done) => setTimeout(done, 100)); }
  }
  if (!page) throw new Error('Headless browser did not start');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((done, reject) => { socket.onopen = done; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const result = JSON.parse(data);
    if (pending.has(result.id)) { pending.get(result.id)(result); pending.delete(result.id); }
  };
  const call = (method, params) => new Promise((done) => {
    const id = ++sequence;
    pending.set(id, done);
    socket.send(JSON.stringify({ id, method, params }));
  });
  await new Promise((done) => setTimeout(done, 2000));
  const result = await call('Runtime.evaluate', { expression: `(async () => {
    const { generateDemoTickets } = await import('${origin}/assets/js/demo-tickets.mjs');
    const result = await generateDemoTickets({ requestId: crypto.randomUUID(), movieId: 'interstellar', seats: ['r1-s1'] });
    return { bytes: result.bytes.length, number: result.tickets[0].number, price: result.tickets[0].price };
  })()`, awaitPromise: true, returnByValue: true });
  if (result.error || result.result?.exceptionDetails) throw new Error(JSON.stringify(result.error || result.result.exceptionDetails));
  console.log(JSON.stringify(result.result.result.value));
  const checkout = await call('Runtime.evaluate', { expression: `(async () => {
    const hall = document.querySelector('.cinema-hall');
    hall.querySelector('[data-seat-id="r1-s1"]').click();
    hall.querySelector('.hall-pay').click();
    const focused = document.activeElement.className;
    hall.querySelector('.hall-confirm-payment').click();
    hall.querySelector('.ticket-send').click();
    const link = hall.querySelector('.ticket-download');
    for (let attempt = 0; attempt < 200 && link.hidden; attempt++) {
      if (hall.querySelector('.ticket-status').dataset.error === 'true') throw new Error(hall.querySelector('.ticket-status').textContent);
      await new Promise((done) => setTimeout(done, 25));
    }
    if (link.hidden) throw new Error('PDF download did not appear');
    const pdf = await (await fetch(link.href)).blob();
    if (pdf.type !== 'application/pdf' || !pdf.size) throw new Error('Invalid download');
    return { focused, download: link.download, bytes: pdf.size, status: hall.querySelector('.ticket-status').textContent };
  })()`, awaitPromise: true, returnByValue: true });
  if (checkout.error || checkout.result?.exceptionDetails) throw new Error(JSON.stringify(checkout.error || checkout.result.exceptionDetails));
  console.log(JSON.stringify(checkout.result.result.value));
})().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => { socket?.close(); browser.kill(); });
