const fs = require('node:fs');
fs.mkdirSync('assets/vendor', { recursive: true });
for (const [source, target] of [
  ['node_modules/pdf-lib/dist/pdf-lib.esm.min.js', 'assets/vendor/pdf-lib.mjs'],
  ['node_modules/pdf-lib/LICENSE.md', 'assets/vendor/pdf-lib-LICENSE.md'],
  ['node_modules/@pdf-lib/fontkit/README.md', 'assets/vendor/fontkit-README.md'],
]) fs.copyFileSync(source, target);
// The ESM distribution imports bare "pako", which browsers cannot resolve.
// The UMD distribution includes all dependencies; expose it as a local ES module.
const fontkit = fs.readFileSync('node_modules/@pdf-lib/fontkit/dist/fontkit.umd.min.js', 'utf8');
fs.writeFileSync('assets/vendor/fontkit.mjs', 'const module = { exports: {} };\nconst exports = module.exports;\n' + fontkit + '\nexport default module.exports;\n');
console.log('Bundled local PDF libraries for the browser.');
