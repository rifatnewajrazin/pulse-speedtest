const crypto = require('crypto');
const CHUNK = crypto.randomBytes(1 << 20);     // incompressible 1MB block
const MAX = 100 * 1024 * 1024;                 // per-request cap (protects bandwidth quota)
module.exports = (req, res) => {
  let left = Math.min(parseInt(new URL(req.url, 'http://x').searchParams.get('bytes')) || 25e6, MAX);
  res.writeHead(200, { 'Cache-Control': 'no-store, no-transform', 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'identity' });
  res.on('close', () => { left = 0; });
  const pump = () => {
    while (left > 0) {
      const buf = left >= CHUNK.length ? CHUNK : CHUNK.subarray(0, left);
      left -= buf.length;
      if (!res.write(buf)) return res.once('drain', pump);
    }
    res.end();
  };
  pump();
};
