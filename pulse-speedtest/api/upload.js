module.exports = (req, res) => {
  let n = 0;
  req.on('data', c => { n += c.length; });
  req.on('end', () => { res.setHeader('Cache-Control', 'no-store'); res.json({ received: n }); });
};
