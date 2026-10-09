import { fontBase64 } from './fonts/noto-sans.mjs';
import { ticketFields } from './tickets.mjs';

const fontBytes = Uint8Array.from(atob(fontBase64), (character) => character.charCodeAt(0));
const fixedDate = new Date('2000-01-01T00:00:00.000Z');

export function wrapText(text, font, size, width) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) { line = next; continue; }
    if (line) { lines.push(line); line = ''; }
    for (const character of word) {
      if (line && font.widthOfTextAtSize(line + character, size) > width) {
        lines.push(line); line = '';
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderTicketsPdf(tickets, dependencies) {
  if (!tickets.length) throw new Error('No tickets to render');
  const { PDFDocument, rgb } = dependencies || await import('pdf-lib');
  const fontkit = dependencies?.fontkit || (await import('@pdf-lib/fontkit')).default;
  const document = await PDFDocument.create();
  // Stable metadata is required: a retry must attach exactly the same bytes.
  document.setCreationDate(fixedDate);
  document.setModificationDate(fixedDate);
  document.setProducer('KADR');
  document.setCreator('KADR');
  document.setTitle('Квитки — КАДР');
  document.registerFontkit(fontkit);
  const font = await document.embedFont(fontBytes, { subset: true });
  const ink = rgb(.1, .1, .12);
  const muted = rgb(.39, .39, .43);
  const accent = rgb(.78, .16, .14);
  for (const ticket of tickets) {
    const page = document.addPage([420, 595]);
    page.drawRectangle({ x: 20, y: 20, width: 380, height: 555, borderWidth: 1, borderColor: rgb(.84, .84, .88) });
    let y = 544;
    ticketFields(ticket).forEach(([label, value], index) => {
      page.drawText(label, { x: 40, y, size: 11, font, color: muted });
      y -= 26;
      const size = index === 0 ? 12 : 17;
      for (const line of wrapText(value, font, size, 340)) {
        page.drawText(line, { x: 40, y, size, font, color: index === 0 ? accent : ink });
        y -= size + 6;
      }
      page.drawLine({ start: { x: 40, y: y - 5 }, end: { x: 380, y: y - 5 }, thickness: .5, color: rgb(.88, .88, .9) });
      y -= 31;
    });
    const note = 'Демонстраційний квиток. Оплата не здійснювалася, місце не заброньовано.';
    wrapText(note, font, 9, 340).forEach((line, index) => page.drawText(line, { x: 40, y: 57 - index * 14, size: 9, font, color: muted }));
  }
  return document.save();
}

export function pdfAttachment(bytes, requestId) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return { filename: `kadr-tickets-${requestId}.pdf`, content: btoa(binary), content_type: 'application/pdf' };
}
