import { mkdir, writeFile } from 'node:fs/promises';
import { renderTicketsPdf } from '../supabase/functions/send-tickets/pdf.mjs';

await mkdir('docs', { recursive: true });
const bytes = await renderTicketsPdf([{
  number: 'KADR-0123456789ABCDEF0123456789ABCDEF',
  seat: 'Ряд 8, місце 2 (VIP-диван)', price: 350,
  sessionName: 'Інтерстеллар · 18:30', durationMinutes: 169,
}]);
await writeFile('docs/ticket-example.pdf', bytes);
console.log('Created docs/ticket-example.pdf');
if (process.argv.includes('--image')) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { createCanvas } = await import('@napi-rs/canvas');
  const document = await getDocument({ data: bytes.slice() }).promise;
  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  await writeFile('docs/ticket-example.png', canvas.toBuffer('image/png'));
  await document.destroy();
  console.log('Created docs/ticket-example.png');
}
