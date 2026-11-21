const db = require('../../config/db');

exports.getAssets = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM assets WHERE enterprise_id = ? ORDER BY created_at DESC', [req.enterpriseId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createAsset = async (req, res) => {
  try {
    const { name, type, serial_no, status, assigned_to, purchase_date, value } = req.body;
    await db.query(
      'INSERT INTO assets (name, type, serial_no, status, assigned_to, purchase_date, value, enterprise_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, type, serial_no, status || 'Available', assigned_to, purchase_date, value || 0, req.enterpriseId]
    );
    res.status(201).json({ success: true, message: 'Asset created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const { name, type, serial_no, status, assigned_to, purchase_date, value } = req.body;
    await db.query(
      'UPDATE assets SET name=?, type=?, serial_no=?, status=?, assigned_to=?, purchase_date=?, value=? WHERE id=?',
      [name, type, serial_no, status, assigned_to, purchase_date, value, req.params.id]
    );
    res.json({ success: true, message: 'Asset updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    await db.query('DELETE FROM assets WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
