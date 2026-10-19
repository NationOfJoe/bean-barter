// Builds android/assets/: an offline copy of the game with the Google Fonts embedded
// and PeerJS stored next to it, so nothing has to load from the internet.
// Downloads are cached in android/.cache, so later builds work offline too.
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'assets');
const CACHE = path.join(__dirname, '.cache');
const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
// A modern browser user agent makes Google Fonts answer with woff2 files.
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

function get(url) {
  const file = path.join(CACHE, url.replace(/[^a-z0-9.]+/gi, '_').slice(-180));
  if (fs.existsSync(file)) return Promise.resolve(fs.readFileSync(file));
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return resolve(get(new URL(res.headers.location, url).href));
      if (res.statusCode !== 200) return reject(new Error(`${res.statusCode} for ${url}`));
      const parts = [];
      res.on('data', d => parts.push(d));
      res.on('end', () => { const buf = Buffer.concat(parts); fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(file, buf); resolve(buf); });
    }).on('error', reject);
  });
}

(async () => {
  let html = fs.readFileSync(path.join(ROOT, 'bean-barter.html'), 'utf8');

  // Fonts: keep only the latin subsets and inline each font file as a data URI.
  const fontLink = html.match(/<link href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)" rel="stylesheet">/);
  if (!fontLink) throw new Error('Google Fonts link not found');
  const css = (await get(fontLink[1].replace(/&amp;/g, '&'))).toString('utf8');
  const blocks = css.split(/(?=\/\* [a-z-]+ \*\/)/).filter(b => b.startsWith('/* latin */'));
  let fontCss = '';
  for (const block of blocks) {
    const url = block.match(/url\((https:[^)]+)\)/)[1];
    const data = (await get(url)).toString('base64');
    fontCss += block.replace(url, `data:font/woff2;base64,${data}`);
  }
  html = html
    .replace(/<link rel="preconnect"[^>]*>\n/g, '')
    .replace(fontLink[0], `<style>\n${fontCss}</style>`);

  // PeerJS: load the local copy (online play still needs a connection, but the page never waits on a CDN).
  html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/peerjs@[^"]+"><\/script>/, '<script src="peerjs.min.js"></script>');
  if (html.includes('cdn.jsdelivr.net') || html.includes('fonts.googleapis.com')) throw new Error('An external URL is still in the page');

  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>[hidden]{display:none!important}body{margin:0}</style>
</head>
<body>
${html}
</body>
</html>
`;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'index.html'), page);
  fs.writeFileSync(path.join(OUT, 'peerjs.min.js'), await get(PEERJS_URL));
  console.log(`Wrote assets: index.html (${Math.round(page.length / 1024)} KB, ${blocks.length} font files embedded) and peerjs.min.js`);
})().catch(e => { console.error(e.message); process.exit(1); });
