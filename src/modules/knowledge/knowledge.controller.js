const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

// ─── Overview ─────────────────────────────────────────────────────────────────
exports.getKBOverview = async (req, res) => {
  try {
    const eid = req.enterpriseId;
    const [[{ total }]]      = await db.query('SELECT COUNT(*) AS total FROM kb_articles WHERE enterprise_id = ?', [eid]);
    const [[{ published }]]  = await db.query("SELECT COUNT(*) AS published FROM kb_articles WHERE status='Published' AND enterprise_id = ?", [eid]);
    const [[{ drafts }]]     = await db.query("SELECT COUNT(*) AS drafts FROM kb_articles WHERE status='Draft' AND enterprise_id = ?", [eid]);
    const [[{ totalViews }]] = await db.query('SELECT COALESCE(SUM(views),0) AS totalViews FROM kb_articles WHERE enterprise_id = ?', [eid]);
    const [[{ categories }]] = await db.query('SELECT COUNT(*) AS categories FROM kb_categories WHERE enterprise_id = ?', [eid]);

    const [recent] = await db.query(`
      SELECT a.id, a.title, a.status, a.author, a.views, a.created_at,
             c.name AS category_name, c.color AS category_color
      FROM kb_articles a
      LEFT JOIN kb_categories c ON a.category_id = c.id
      WHERE a.enterprise_id = ?
      ORDER BY a.created_at DESC LIMIT 5
    `, [eid]);

    const [byCategory] = await db.query(`
      SELECT c.name, c.color, COUNT(a.id) AS count
      FROM kb_categories c
      LEFT JOIN kb_articles a ON a.category_id = c.id
      WHERE c.enterprise_id = ?
      GROUP BY c.id, c.name, c.color
    `, [eid]);

    res.json({ success: true, data: {
      total: Number(total), published: Number(published),
      drafts: Number(drafts), totalViews: Number(totalViews),
      categories: Number(categories), recent, byCategory,
    }});
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Articles ─────────────────────────────────────────────────────────────────
exports.getArticles = async (req, res) => {
  try {
    const { category, status } = req.query;
    let sql = `
      SELECT a.*, c.name AS category_name, c.color AS category_color
      FROM kb_articles a LEFT JOIN kb_categories c ON a.category_id = c.id
      WHERE a.enterprise_id = ?
    `;
    const params = [req.enterpriseId];
    if (category) { sql += ' AND c.name = ?'; params.push(category); }
    if (status)   { sql += ' AND a.status = ?'; params.push(status); }
    sql += ' ORDER BY a.created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createArticle = async (req, res) => {
  try {
    const { title, content, category_id, status, author } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    const id = uuidv4();
    await db.query(
      'INSERT INTO kb_articles (id,category_id,title,content,status,author,enterprise_id) VALUES (?,?,?,?,?,?,?)',
      [id, category_id||null, title, content||'', status||'Draft', author||req.user?.first_name||'Admin', req.enterpriseId]
    );
    const [[row]] = await db.query(
      'SELECT a.*, c.name AS category_name FROM kb_articles a LEFT JOIN kb_categories c ON a.category_id=c.id WHERE a.id=?',
      [id]
    );
    res.status(201).json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateArticle = async (req, res) => {
  try {
    const { title, content, category_id, status } = req.body;
    await db.query(
      'UPDATE kb_articles SET title=COALESCE(?,title), content=COALESCE(?,content), category_id=COALESCE(?,category_id), status=COALESCE(?,status) WHERE id=?',
      [title, content, category_id, status, req.params.id]
    );
    const [[row]] = await db.query(
      'SELECT a.*, c.name AS category_name FROM kb_articles a LEFT JOIN kb_categories c ON a.category_id=c.id WHERE a.id=?',
      [req.params.id]
    );
    res.json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteArticle = async (req, res) => {
  try {
    await db.query('DELETE FROM kb_articles WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Categories ───────────────────────────────────────────────────────────────
exports.getCategories = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, COUNT(a.id) AS article_count
      FROM kb_categories c LEFT JOIN kb_articles a ON a.category_id = c.id
      WHERE c.enterprise_id = ?
      GROUP BY c.id ORDER BY c.created_at
    `, [req.enterpriseId]);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const id = uuidv4();
    await db.query(
      'INSERT INTO kb_categories (id,name,icon,color,enterprise_id) VALUES (?,?,?,?,?)',
      [id, name, icon||'BookOpen', color||'#939BFF', req.enterpriseId]
    );
    const [[row]] = await db.query('SELECT * FROM kb_categories WHERE id=?', [id]);
    res.status(201).json({ success: true, data: row });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteCategory = async (req, res) => {
  try {
    await db.query('DELETE FROM kb_categories WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
