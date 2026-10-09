export class TicketError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}

export function validateOrder(input, catalog) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TicketError('invalid_order');
  const { requestId, movieId, seats } = input;
  if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new TicketError('invalid_order');
  if (typeof movieId !== 'string' || !Object.hasOwn(catalog, movieId)) throw new TicketError('invalid_order');
  const movie = catalog[movieId];
  if (!Array.isArray(seats) || !seats.length || seats.length > 36 || new Set(seats).size !== seats.length) throw new TicketError('invalid_order');
  if (seats.some((id) => typeof id !== 'string' || !Object.hasOwn(movie.seats, id))) throw new TicketError('invalid_seat');
  return { requestId: requestId.toLowerCase(), movieId, seats: [...seats].sort() };
}

export async function buildTickets(order, userId, catalog) {
  const movie = catalog[order.movieId];
  return Promise.all(order.seats.map(async (id) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${userId}/${order.requestId}/${order.movieId}/${id}`));
    const number = 'KADR-' + [...new Uint8Array(digest)].slice(0, 16).map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    return { number, seat: movie.seats[id].label, price: movie.seats[id].price,
      sessionName: `${movie.title} · ${movie.time}`, durationMinutes: movie.durationMinutes };
  }));
}

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function ticketFields(ticket) {
  return [
    ['Номер квитка', ticket.number],
    ['Номер місця', ticket.seat],
    ['Вартість', `${ticket.price} ₴`],
    ['Назва сеансу', ticket.sessionName],
    ['Тривалість', `${ticket.durationMinutes} хв`],
  ];
}

export function renderTicketEmail(tickets) {
  const note = 'Демонстраційні квитки. Оплата не здійснювалася, місця не заброньовано.';
  const text = tickets.map((ticket) => ticketFields(ticket).map(([label, value]) => `${label}: ${value}`).join('\n')).join('\n\n') + `\n\n${note}`;
  const html = `<!doctype html><html lang="uk"><body style="margin:0;background:#f4f4f6;padding:24px;font-family:Arial,sans-serif;color:#19191f"><main style="max-width:600px;margin:auto">
    ${tickets.map((ticket) => `<table role="presentation" width="100%" cellspacing="0" style="background:white;border:1px solid #dddde4;border-radius:12px;margin-bottom:20px;padding:20px">${ticketFields(ticket).map(([label, value], index) => `<tr><td style="padding:10px 0;${index === 0 ? 'font-size:18px;font-weight:bold;color:#c82823;' : ''}"><div style="font-size:12px;color:#62626e;margin-bottom:4px">${escapeHtml(label)}</div><div style="overflow-wrap:anywhere">${escapeHtml(value)}</div></td></tr>`).join('')}</table>`).join('')}
    <p style="font-size:12px;color:#62626e">${note}</p></main></body></html>`;
  return { html, text };
}
