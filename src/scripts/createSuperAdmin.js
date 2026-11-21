require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const db     = require('../config/db');

const EMAIL    = process.env.SUPERADMIN_EMAIL    || 'aminodtaijjas@gmail.com';
const PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Taij@#!$2026Taij';

(async () => {
  try {
    const hashed = await bcrypt.hash(PASSWORD, 10);

    const [[existing]] = await db.query(
      'SELECT id, email FROM users WHERE role = ?', ['super_admin']
    );

    if (existing) {
      await db.query(
        'UPDATE users SET email = ?, password = ? WHERE role = ?',
        [EMAIL, hashed, 'super_admin']
      );
      console.log(`✅ Super admin updated → ${EMAIL} / ${PASSWORD}`);
    } else {
      await db.query(
        `INSERT INTO users (id, first_name, last_name, email, password, role, subscription_status, kyc_status)
         VALUES (UUID(), 'Super', 'Admin', ?, ?, 'super_admin', 'ACTIVE', 'APPROVED')`,
        [EMAIL, hashed]
      );
      console.log(`✅ Super admin created → ${EMAIL} / ${PASSWORD}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
