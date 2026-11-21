const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const ENTERPRISE_COLS = `id, first_name, last_name, email, role, avatar, company_name,
  referral_code, subscription_status, trial_start_at, trial_end_at, kyc_status, discount_tier,
  approved_sections, created_at`;

const User = {
  findByEmail:  (email) => db.query('SELECT * FROM users WHERE email = ?', [email]),
  findById:     (id)    => db.query(`SELECT ${ENTERPRISE_COLS} FROM users WHERE id = ?`, [id]),
  findByIdFull: (id)    => db.query('SELECT password FROM users WHERE id = ?', [id]),
  list:         ()      => db.query('SELECT id, first_name, last_name, email, role FROM users ORDER BY first_name'),
  listByEnterprise: (enterpriseId) => db.query(
    'SELECT id, first_name, last_name, email, role FROM users WHERE enterprise_id = ? OR id = ? ORDER BY first_name',
    [enterpriseId, enterpriseId]
  ),
  listAll:      ()      => db.query(`SELECT ${ENTERPRISE_COLS} FROM users ORDER BY created_at DESC`),

  create: ({ firstName, lastName, email, hashedPassword, role,
             companyName, referralCode, subscriptionStatus, trialStartAt, trialEndAt, kycStatus, enterpriseId }) => {
    const id = uuidv4();
    return db.query(
      `INSERT INTO users
         (id, first_name, last_name, email, password, role,
          company_name, referral_code, subscription_status, trial_start_at, trial_end_at, kyc_status, enterprise_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, firstName, lastName ?? null, email.toLowerCase(), hashedPassword, role,
       companyName ?? null, referralCode ?? null,
       subscriptionStatus ?? 'TRIAL', trialStartAt ?? null, trialEndAt ?? null, kycStatus ?? 'PENDING',
       enterpriseId ?? null]
    ).then(() => id);
  },

  update: (id, { firstName, lastName, avatar }) =>
    db.query(
      'UPDATE users SET first_name=COALESCE(?,first_name), last_name=COALESCE(?,last_name), avatar=COALESCE(?,avatar) WHERE id=?',
      [firstName, lastName, avatar, id]
    ),

  updatePassword: (id, hashedPassword) =>
    db.query('UPDATE users SET password=? WHERE id=?', [hashedPassword, id]),

  // Enterprise / subscription
  findEnterprises: () =>
    db.query(`SELECT ${ENTERPRISE_COLS} FROM users WHERE role='admin' ORDER BY created_at DESC`),

  findEnterpriseById: (id) =>
    db.query(`SELECT ${ENTERPRISE_COLS} FROM users WHERE id=? AND role='admin'`, [id]),

  searchEnterprises: (q) =>
    db.query(
      `SELECT ${ENTERPRISE_COLS} FROM users
       WHERE role='admin' AND (company_name LIKE ? OR email LIKE ?)
       ORDER BY created_at DESC LIMIT 20`,
      [`%${q}%`, `%${q}%`]
    ),

  updateSubscription: (id, { subscription_status, discount_tier }) =>
    db.query(
      'UPDATE users SET subscription_status=?, discount_tier=? WHERE id=?',
      [subscription_status, discount_tier, id]
    ),
};

module.exports = User;
