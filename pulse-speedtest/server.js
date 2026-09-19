// Zero-dependency speed test server: node server.js
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const CHUNK = crypto.randomBytes(1 << 20); // incompressible 1MB block, reused
const MAX_DL = 1024 * 1024 * 1024;         // 1 GB cap per request
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

const cleanIp = ip => (ip || '').replace(/^::ffff:/, '');
function clientIp(req) {
  const xf = req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return cleanIp(xf || req.socket.remoteAddress);
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const noCache = { 'Cache-Control': 'no-store, no-transform', 'Access-Control-Allow-Origin': '*' };

  if (url.pathname === '/api/ping') { res.writeHead(204, noCache); return res.end(); }

  if (url.pathname === '/api/ip') {
    res.writeHead(200, { ...noCache, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ip: clientIp(req),
      viaProxy: !!(req.headers['x-forwarded-for'] || req.headers['via'] || req.headers['forwarded']),
      httpVersion: req.httpVersion,
    }));
  }

  if (url.pathname === '/api/download') {
    let left = Math.min(parseInt(url.searchParams.get('bytes')) || 25e6, MAX_DL);
    res.writeHead(200, { ...noCache, 'Content-Type': 'application/octet-stream', 'Content-Length': left, 'Content-Encoding': 'identity' });
    const pump = () => {
      while (left > 0) {
        const buf = left >= CHUNK.length ? CHUNK : CHUNK.subarray(0, left);
        left -= buf.length;
        if (!res.write(buf)) return res.once('drain', pump);
      }
      res.end();
    };
    res.on('close', () => { left = 0; });
    return pump();
  }

  if (url.pathname === '/api/upload' && req.method === 'POST') {
    let n = 0;
    req.on('data', c => { n += c.length; });
    req.on('end', () => { res.writeHead(200, { ...noCache, 'Content-Type': 'application/json' }); res.end(JSON.stringify({ received: n })); });
    return;
  }

  const file = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : path.normalize(url.pathname).replace(/^(\.\.[\/\\])+/, ''));
  if (!file.startsWith(path.join(__dirname, 'public'))) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, data) => {
    if (e) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Speed test running → http://localhost:${PORT}`));
