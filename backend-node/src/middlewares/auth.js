const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace("Bearer ", "").trim() || authHeader;
    if (!token) return res.status(401).json({ error: 'Token not provided' });

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    // expected payload: { auth_user_id, salao_id, cargo }
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
