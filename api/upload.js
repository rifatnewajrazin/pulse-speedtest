// Counts bytes of an uploaded body. Body cap on Vercel functions is 4.5 MB per request.
module.exports = (req, res) => {
  let n = 0, sent = false;
  const finish = () => {
    if (sent) return; sent = true;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Pulse-Region', process.env.VERCEL_REGION || 'local');
    res.status(200).json({ received: n });
  };
  if (req.readableEnded || req.complete && req.body != null) {   // body already consumed by the platform
    n = Buffer.isBuffer(req.body) ? req.body.length : Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || ''));
    return finish();
  }
  req.on('data', c => { n += c.length; });
  req.on('end', finish);
  req.on('error', finish);
};
