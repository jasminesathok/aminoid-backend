const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

exports.getPlans = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM plans WHERE is_active = 1 ORDER BY price_monthly ASC');
    const parsed = rows.map(r => ({
      ...r,
      features_json: typeof r.features_json === 'string' ? JSON.parse(r.features_json) : (r.features_json || [])
    }));
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching plans' });
  }
};

exports.createPlan = async (req, res) => {
  try {
    const { name, description, price_monthly, price_annual, max_users, max_storage_gb, max_api_calls, features_json, color_theme } = req.body;
    
    // Validate required fields
    if (!name || price_monthly === undefined) {
      return res.status(400).json({ message: 'Name and monthly price are required' });
    }

    const id = uuidv4();
    const features = features_json || [];

    await db.query(
      `INSERT INTO plans (id, name, description, price_monthly, price_annual, max_users, max_storage_gb, max_api_calls, features_json, color_theme)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, price_monthly, price_annual || 0, max_users || 1, max_storage_gb || 1, max_api_calls || 1000, JSON.stringify(features), color_theme || 'default']
    );

    const [newPlan] = await db.query('SELECT * FROM plans WHERE id = ?', [id]);
    res.status(201).json(newPlan[0]);
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'A plan with this name already exists' });
    }
    res.status(500).json({ message: 'Server error creating plan' });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price_monthly, price_annual, max_users, max_storage_gb, max_api_calls, features_json, color_theme } = req.body;
    
    const [existing] = await db.query('SELECT * FROM plans WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Plan not found' });

    const features = features_json || [];

    await db.query(
      `UPDATE plans 
       SET name = ?, description = ?, price_monthly = ?, price_annual = ?, max_users = ?, max_storage_gb = ?, max_api_calls = ?, features_json = ?, color_theme = ?
       WHERE id = ?`,
      [name, description, price_monthly, price_annual, max_users, max_storage_gb, max_api_calls, JSON.stringify(features), color_theme, id]
    );

    const [updatedPlan] = await db.query('SELECT * FROM plans WHERE id = ?', [id]);
    res.json(updatedPlan[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating plan' });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    // Soft delete by setting is_active = 0
    await db.query('UPDATE plans SET is_active = 0 WHERE id = ?', [id]);
    res.json({ message: 'Plan successfully deleted (soft delete)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting plan' });
  }
};
