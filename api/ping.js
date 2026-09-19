module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.setHeader('X-Pulse-Region', process.env.VERCEL_REGION || 'local');
  res.status(204).end();
};
