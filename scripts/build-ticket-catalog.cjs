const fs = require('node:fs');
const path = require('node:path');
const catalog = {};
for (const file of fs.readdirSync('pages/movies').filter((name) => name.endsWith('.html')).sort()) {
  const filename = path.join('pages/movies', file);
  let html = fs.readFileSync(filename, 'utf8');
  const id = path.basename(file, '.html');
  const title = html.match(/<h1 id="movie-title">([^<]+)<\/h1>/)[1];
  const durationMinutes = Number(html.match(/<dt>Тривалість<\/dt><dd>(\d+)/)[1]);
  const time = html.match(/class="hall-session"[\s\S]*?<time>([^<]+)<\/time>/)[1];
  const seats = {};
  html = html.replace(/<button\b[^>]*data-seat-label="([^"]+)"[^>]*>/g, (button, label) => {
    const match = label.match(/^Ряд (\d+), місце (\d+)/);
    const seatId = `r${match[1]}-s${match[2]}`;
    if (!/\sdisabled\b/.test(button)) seats[seatId] = { label, price: Number(button.match(/data-price="(\d+)"/)[1]) };
    return button.includes('data-seat-id=') ? button : button.replace('data-seat-label=', `data-seat-id="${seatId}" data-seat-label=`);
  });
  catalog[id] = { title, durationMinutes, time, seats };
  html = html.replace('class="cinema-hall" id=', `class="cinema-hall" data-movie-id="${id}" id=`);
  if (!html.includes('assets/js/tickets.js')) html = html.replace('<script src="../../assets/js/movie.js" defer></script>', '<script src="../../assets/js/movie.js" defer></script>\n    <script src="../../assets/js/tickets.js" defer></script>');
  if ((html.match(/class="ticket-email-actions"(?: hidden)?/g) || []).length > 1) {
    html = html.replace(/[ \t]*<div class="ticket-email-actions">[\s\S]*?<\/div>\s*<div class="ticket-preview"><\/div>\r?\n/g, '');
  }
  if (!/class="[^"]*\bticket-send\b/.test(html)) html = html.replace(/(<p class="hall-note" id="payment-note">[\s\S]*?<\/p>)/, `$1
          <div class="ticket-email-actions">
            <button class="button-primary ticket-send" type="button" hidden>Надіслати квитки на пошту</button>
            <a class="button-primary ticket-login">Увійти та отримати квитки</a>
            <p class="ticket-status" role="status" aria-live="polite"></p>
            <p class="hall-note">Демонстраційні квитки: оплата й бронювання ще не підключені.</p>
          </div>
          <div class="ticket-preview"></div>`);
  if (!html.includes('class="ticket-payment-actions"')) {
    html = html.replace('<div class="ticket-email-actions">', `<div class="ticket-payment-actions">
            <button class="button-primary hall-confirm-payment" type="button">Оплатити</button>
            <p class="hall-note">Демонстраційна оплата: гроші не списуються.</p>
          </div>
          <div class="ticket-email-actions" hidden>`);
    html = html.replace(/[ \t]*<p class="ticket-status" role="status" aria-live="polite"><\/p>\r?\n/, '');
    html = html.replace('<div class="ticket-preview"></div>', '<p class="ticket-status" role="status" aria-live="polite"></p>\n          <div class="ticket-preview"></div>');
  }
  if (!html.includes('class="button-primary ticket-download"')) {
    html = html.replace('<div class="ticket-preview"></div>', '<a class="button-primary ticket-download" hidden>Завантажити квитки у PDF</a>\n          <div class="ticket-preview"></div>');
  }
  fs.writeFileSync(filename, html.replace(/\sautofocus\b/g, '').replace(/[ \t]+\r?$/gm, ''));
}
fs.mkdirSync('supabase/functions/send-tickets', { recursive: true });
fs.writeFileSync('supabase/functions/send-tickets/catalog.json', JSON.stringify(catalog, null, 2) + '\n');
console.log(`Updated ticket catalog for ${Object.keys(catalog).length} movies.`);
