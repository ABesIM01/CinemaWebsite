import { PDFDocument, rgb } from '../vendor/pdf-lib.mjs';
import fontkit from '../vendor/fontkit.mjs';
import { validateOrder, buildTickets } from '../../supabase/functions/send-tickets/tickets.mjs';
import { renderTicketsPdf } from '../../supabase/functions/send-tickets/pdf.mjs';

let catalogPromise;
export async function generateDemoTickets(order) {
  catalogPromise ||= fetch(new URL('../../supabase/functions/send-tickets/catalog.json', import.meta.url))
    .then((response) => {
      if (!response.ok) throw new Error('Ticket catalog unavailable');
      return response.json();
    }).catch((error) => { catalogPromise = null; throw error; });
  const catalog = await catalogPromise;
  const tickets = await buildTickets(validateOrder(order, catalog), 'demo', catalog);
  const bytes = await renderTicketsPdf(tickets, { PDFDocument, rgb, fontkit });
  return { tickets, bytes };
}
