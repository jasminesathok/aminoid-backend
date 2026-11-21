const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

// ─── Get current subscription ─────────────────────────────────────────────────
exports.getSubscription = async (req, res) => {
  try {
    const [[sub]] = await db.query('SELECT * FROM subscriptions LIMIT 1');
    if (!sub) return res.json({ success: true, data: null });
    res.json({ success: true, data: sub });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Upgrade / downgrade plan ─────────────────────────────────────────────────
exports.upgradePlan = async (req, res) => {
  try {
    const { plan, billing_cycle } = req.body;
    const planPricing = { Starter: 0, Pro: 79, Enterprise: 199 };
    const planSeats   = { Starter: 5, Pro: 20, Enterprise: 100 };
    const planStorage = { Starter: 5, Pro: 50, Enterprise: 500 };
    const planApi     = { Starter: 10000, Pro: 100000, Enterprise: 1000000 };

    const amount = billing_cycle === 'Annual'
      ? planPricing[plan] * 10  // 2-month discount
      : planPricing[plan];

    const [[existing]] = await db.query('SELECT id FROM subscriptions LIMIT 1');
    if (existing) {
      await db.query(
        `UPDATE subscriptions SET plan=?, billing_cycle=COALESCE(?,billing_cycle),
          seats_total=?, storage_total_gb=?, api_calls_total=?, amount=?,
          renewal_date=DATE_ADD(CURRENT_DATE, INTERVAL IF(?='Annual',365,30) DAY)
         WHERE id=?`,
        [plan, billing_cycle, planSeats[plan], planStorage[plan], planApi[plan], amount, billing_cycle||'Monthly', existing.id]
      );
    } else {
      await db.query(
        `INSERT INTO subscriptions (id,plan,status,seats_total,storage_total_gb,api_calls_total,billing_cycle,renewal_date,amount)
         VALUES (UUID(),?,?,?,?,?,?,DATE_ADD(CURRENT_DATE,INTERVAL 30 DAY),?)`,
        [plan, 'Active', planSeats[plan], planStorage[plan], planApi[plan], billing_cycle||'Monthly', amount]
      );
    }
    const [[sub]] = await db.query('SELECT * FROM subscriptions LIMIT 1');
    res.json({ success: true, data: sub });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Usage ────────────────────────────────────────────────────────────────────
exports.getUsage = async (req, res) => {
  try {
    const [[sub]] = await db.query(
      'SELECT seats_used,seats_total,storage_used_gb,storage_total_gb,api_calls_used,api_calls_total FROM subscriptions LIMIT 1'
    );
    res.json({ success: true, data: sub || {} });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Billing history ─────────────────────────────────────────────────────────
exports.getBillingHistory = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM billing_history ORDER BY billed_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
