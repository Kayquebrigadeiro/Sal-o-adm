module.exports = function (req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.cargo !== 'VENDEDOR') return res.status(403).json({ error: 'Forbidden: requires VENDEDOR' });
  return next();
};
