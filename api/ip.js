module.exports = (req, res) => {
  const ip = (req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress || '').trim().replace(/^::ffff:/, '');
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ip, viaProxy: false, httpVersion: req.httpVersion });
};
