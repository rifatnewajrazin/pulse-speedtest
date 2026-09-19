module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.status(204).end();
};
