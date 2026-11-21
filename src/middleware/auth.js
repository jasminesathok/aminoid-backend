const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer'))
    token = req.headers.authorization.split(' ')[1];

  if (!token)
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_amnoid_jwt_token_key_2026_xyz');
    const User = require('../models/User');
    const [rows] = await User.findById(decoded.id);
    if (!rows.length)
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) return next();
  return res.status(403).json({ success: false, message: 'Admin access only' });
};

const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'super_admin') return next();
  return res.status(403).json({ success: false, message: 'Super admin access only' });
};

module.exports = { protect, adminOnly, superAdminOnly };
