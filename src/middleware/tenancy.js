/**
 * Tenancy middleware — sets req.enterpriseId for every authenticated request.
 *
 * Rules:
 *  - admin / super_admin  → they ARE the enterprise root; enterpriseId = req.user.id
 *  - member               → their enterprise_id column points to the admin who owns them
 *
 * Must be used AFTER protect middleware so req.user is already populated.
 */
const db = require('../config/db');

const tenancy = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authorized' });

    if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'enterprise') {
  req.enterpriseId = user.id;
} else {
      // member — look up their enterprise_id
      const [[row]] = await db.query(
        'SELECT enterprise_id FROM users WHERE id = ?', [user.id]
      );
      if (!row || !row.enterprise_id) {
        return res.status(403).json({ success: false, message: 'No enterprise assigned to this user' });
      }
      req.enterpriseId = row.enterprise_id;
    }

    next();
  } catch (err) {
    console.error('tenancy middleware error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { tenancy };
