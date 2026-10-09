import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument } from 'pdf-lib';
import { renderTicketsPdf, pdfAttachment } from '../supabase/functions/send-tickets/pdf.mjs';

const ticket = {
  number: 'KADR-0123456789ABCDEF0123456789ABCDEF',
  seat: 'Ряд 8, місце 2 (VIP-диван)', price: 350,
  sessionName: 'Інтерстеллар · 18:30', durationMinutes: 169,
};

test('PDF contains a separate page per seat and readable Ukrainian text in template order', async () => {
  const bytes = await renderTicketsPdf([ticket, { ...ticket, number: 'KADR-2', seat: 'Ряд 1, місце 3', price: 250 }]);
  assert.ok(new TextDecoder().decode(bytes.subarray(0, 8)).startsWith('%PDF-'));
  const document = await getDocument({ data: bytes.slice(), useSystemFonts: false, isEvalSupported: false }).promise;
  try {
    assert.equal(document.numPages, 2);
    const page = await document.getPage(1);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join('\n');
    let previous = -1;
    for (const field of ['Номер квитка', 'Номер місця', 'Вартість', 'Назва сеансу', 'Тривалість']) {
      const index = text.indexOf(field);
      assert.ok(index > previous, field);
      previous = index;
    }
    for (const value of [ticket.number, ticket.seat, '350 ₴', ticket.sessionName, '169 хв', 'Демонстраційний квиток']) assert.ok(text.includes(value), value);
    const second = await (await document.getPage(2)).getTextContent();
    assert.ok(second.items.some((item) => item.str === 'KADR-2'));
  } finally { await document.destroy(); }
});

test('retries generate identical PDF bytes and a base64 attachment that decodes correctly', async () => {
  const first = await renderTicketsPdf([ticket]);
  const retry = await renderTicketsPdf([ticket]);
  assert.deepEqual(first, retry);
  const attachment = pdfAttachment(first, 'example');
  assert.equal(attachment.filename, 'kadr-tickets-example.pdf');
  assert.deepEqual(new Uint8Array(Buffer.from(attachment.content, 'base64')), first);
  const parsed = await PDFDocument.load(Buffer.from(attachment.content, 'base64'));
  assert.equal(parsed.getPageCount(), 1);
});

test('long session titles wrap without crossing the ticket border', async () => {
  const sessionName = 'Готель «Ґранд Будапешт» — спеціальний вечірній сеанс українською мовою · 18:30';
  const bytes = await renderTicketsPdf([{ ...ticket, sessionName }]);
  const document = await getDocument({ data: bytes.slice(), useSystemFonts: false, isEvalSupported: false }).promise;
  try {
    const content = await (await document.getPage(1)).getTextContent();
    const text = content.items.map((item) => item.str).join(' ').replace(/\s+/g, ' ').trim();
    assert.ok(text.includes(sessionName));
    for (const item of content.items) {
      if (!item.str.trim()) continue;
      assert.ok(item.transform[4] >= 39);
      assert.ok(item.transform[4] + item.width <= 381);
      assert.ok(item.transform[5] >= 40);
    }
  } finally { await document.destroy(); }
});
