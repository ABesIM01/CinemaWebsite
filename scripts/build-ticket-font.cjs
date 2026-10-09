const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const base = 'https://raw.githubusercontent.com/notofonts/noto-fonts/main/';
  const fontUrl = base + 'hinted/ttf/NotoSans/NotoSans-Regular.ttf';
  const [fontResponse, licenseResponse] = await Promise.all([fetch(fontUrl), fetch(base + 'LICENSE')]);
  if (!fontResponse.ok || !licenseResponse.ok) throw new Error('Could not download Noto Sans font and license');
  const font = Buffer.from(await fontResponse.arrayBuffer());
  const directory = 'supabase/functions/send-tickets/fonts';
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'noto-sans.mjs'),
    `// Noto Sans Regular, SIL Open Font License. Source: ${fontUrl}\nexport const fontBase64 = '${font.toString('base64')}';\n`);
  await fs.writeFile(path.join(directory, 'OFL.txt'), await licenseResponse.text());
  console.log(`Bundled Noto Sans (${font.length} bytes) with its license.`);
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
