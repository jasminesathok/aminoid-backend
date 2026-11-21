const File = require('../../models/File');
const db   = require('../../config/db');

const getFiles = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    let rows;
    if (isSA) {
      [rows] = await db.query(`
        SELECT f.*,
               ent.company_name AS enterprise_name,
               ent.first_name   AS ent_first,
               ent.last_name    AS ent_last
        FROM files f
        LEFT JOIN users ent ON f.enterprise_id = ent.id
        ORDER BY f.modified DESC
      `);
    } else {
      [rows] = await File.list(req.enterpriseId);
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getFiles error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createFile = async (req, res) => {
  const { name, size, type, folder } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'File name required' });
  try {
    const id = await File.create({ name, size, type, folder, enterpriseId: req.enterpriseId });
    const [r] = await File.findById(id);
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) {
    console.error('createFile error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteFile = async (req, res) => {
  try {
    const [result] = await File.delete(req.params.id);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'File not found' });
    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    console.error('deleteFile error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getFiles, createFile, deleteFile };