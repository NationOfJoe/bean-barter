// Wraps bean-barter.html (the artifact source, which has no <html>/<head>/<body>)
// in a full page and writes index.html for GitHub Pages and local play.
const fs = require('fs');
const path = require('path');

const game = fs.readFileSync(path.join(__dirname, 'bean-barter.html'), 'utf8');
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>[hidden]{display:none!important}body{margin:0}</style>
</head>
<body>
${game}
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'index.html'), page);
console.log('Wrote index.html');
