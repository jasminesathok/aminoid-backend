const db = require('../../config/db');

// ─── Company Settings ─────────────────────────────────────────────────────────
exports.getCompanySettings = async (req, res) => {
  try {
    const eid = req.enterpriseId;

    // Fetch global defaults (enterprise_id = '') first, then overlay with enterprise-specific rows
    const [globalRows] = await db.query(
      'SELECT `key`, value FROM company_settings WHERE enterprise_id = ?', ['']
    );
    const [enterpriseRows] = await db.query(
      'SELECT `key`, value FROM company_settings WHERE enterprise_id = ?', [eid]
    );

    const settings = {};
    globalRows.forEach(r => { settings[r.key] = r.value; });
    const enterpriseData = {};
    enterpriseRows.forEach(r => { 
      settings[r.key] = r.value; 
      enterpriseData[r.key] = r.value;
    });

    const hasEnterpriseSettings = enterpriseRows.length > 0;

    // Return merged settings (global + enterprise-specific) and a flag so frontend
    // can choose to show blanks for newly created enterprises if desired.
    // Also return enterpriseData so frontend knows exactly what is saved locally.
    res.json({ success: true, data: settings, enterpriseData, hasEnterpriseSettings });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateCompanySettings = async (req, res) => {
  try {
    const eid = req.enterpriseId;
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await db.query(
        'INSERT INTO company_settings (id, enterprise_id, `key`, value) VALUES (UUID(),?,?,?) ON DUPLICATE KEY UPDATE value=?',
        [eid, key, value, value]
      );
    }
    // Return merged settings (global + enterprise-specific)
    const [globalRows] = await db.query(
      'SELECT `key`, value FROM company_settings WHERE enterprise_id = ?', ['']
    );
    const [enterpriseRows] = await db.query(
      'SELECT `key`, value FROM company_settings WHERE enterprise_id = ?', [eid]
    );
    const settings = {};
    globalRows.forEach(r => { settings[r.key] = r.value; });
    const enterpriseData = {};
    enterpriseRows.forEach(r => { 
      settings[r.key] = r.value; 
      enterpriseData[r.key] = r.value;
    });

    const hasEnterpriseSettings = enterpriseRows.length > 0;
    res.json({ success: true, data: settings, enterpriseData, hasEnterpriseSettings });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
// ─── Integrations ─────────────────────────────────────────────────────────────
exports.getIntegrations = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM integrations ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.toggleIntegration = async (req, res) => {
  try {
    const { slug } = req.params;
    const [[row]] = await db.query('SELECT * FROM integrations WHERE slug=?', [slug]);
    if (!row) return res.status(404).json({ success: false, message: 'Integration not found' });
    const newState = row.connected ? 0 : 1;
    await db.query('UPDATE integrations SET connected=? WHERE slug=?', [newState, slug]);
    res.json({ success: true, data: { ...row, connected: newState } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Users & Roles (read from users table) ───────────────────────────────────
// CHANGE getUsers to:
exports.getUsers = async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'super_admin') {
      // super admin sees ALL users
      [rows] = await db.query(
        'SELECT id, first_name, last_name, email, role, approved_sections, created_at FROM users ORDER BY created_at DESC'
      );
    } else {
      // enterprise admin sees only their individuals (enterprise_id = their own id)
      [rows] = await db.query(
        'SELECT id, first_name, last_name, email, role, approved_sections, created_at FROM users WHERE enterprise_id = ? ORDER BY created_at DESC',
        [req.user.id]
      );
    }
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ['member', 'admin', 'enterprise'];
    if (!allowed.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });
    await db.query('UPDATE users SET role=? WHERE id=?', [role, req.params.id]);
    const [[row]] = await db.query(
      'SELECT id, first_name, last_name, email, role, approved_sections, created_at FROM users WHERE id=?', [req.params.id]
    );
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateUser = async (req, res) => {
  try {
    const { first_name, last_name, email, role } = req.body;
    const allowed = ['member', 'admin', 'enterprise'];
    if (role && !allowed.includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role' });
    const { approved_sections } = req.body;
    await db.query(
      'UPDATE users SET first_name=COALESCE(?,first_name), last_name=COALESCE(?,last_name), email=COALESCE(?,email), role=COALESCE(?,role), approved_sections=COALESCE(?,approved_sections) WHERE id=?',
      [first_name, last_name, email, role, approved_sections ?? null, req.params.id]
    );
   const [[row]] = await db.query(
      'SELECT id, first_name, last_name, email, role, approved_sections, created_at FROM users WHERE id=?', [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteUser = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
