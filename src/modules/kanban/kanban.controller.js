const KanbanCard = require('../../models/KanbanCard');
const db         = require('../../config/db');

const getBoard = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    let cards;
    if (isSA) {
      [cards] = await db.query(`
        SELECT k.*,
               ent.company_name                        AS enterprise_name,
               CONCAT(ent.first_name,' ',ent.last_name) AS ent_owner,
               creator.first_name                      AS creator_first,
               creator.last_name                       AS creator_last
        FROM kanban_cards k
        LEFT JOIN users ent     ON k.enterprise_id = ent.id
        LEFT JOIN users creator ON k.created_by    = creator.id
        ORDER BY k.enterprise_id, k.col_name, k.position
      `);
    } else {
      [cards] = await db.query(`
        SELECT k.*,
               creator.first_name AS creator_first,
               creator.last_name  AS creator_last
        FROM kanban_cards k
        LEFT JOIN users creator ON k.created_by = creator.id
        WHERE k.enterprise_id = ?
        ORDER BY k.col_name, k.position
      `, [req.enterpriseId]);
    }

    // Attach move history to each card
    const cardIds = cards.map(c => c.id);
    let history = [];
    if (cardIds.length > 0) {
      [history] = await db.query(`
        SELECT h.*,
               CONCAT(u.first_name,' ',u.last_name) AS moved_by_name,
               ent.company_name                      AS enterprise_name
        FROM kanban_card_history h
        LEFT JOIN users u   ON h.moved_by     = u.id
        LEFT JOIN users ent ON h.enterprise_id = ent.id
        WHERE h.card_id IN (?)
        ORDER BY h.moved_at ASC
      `, [cardIds]);
    }

    // Group history by card_id
    const historyMap = history.reduce((acc, h) => {
      if (!acc[h.card_id]) acc[h.card_id] = [];
      acc[h.card_id].push(h);
      return acc;
    }, {});

    const enriched = cards.map(c => ({ ...c, history: historyMap[c.id] || [] }));
    res.json({ success: true, data: { columns: ['Todo', 'In Progress', 'Review', 'Done'], cards: enriched } });
  } catch (err) {
    console.error('getBoard error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createCard = async (req, res) => {
  const { title, column = 'Todo', priority = 'Medium', assignee, due } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'Card title required' });
  try {
    const id = await KanbanCard.create({
      title, column, priority, assignee, due,
      enterpriseId: req.enterpriseId,
      createdBy:    req.user.id,
    });
    const [r] = await KanbanCard.findById(id);
    // Log creation as first history entry
    await db.query(
      'INSERT INTO kanban_card_history (card_id, from_col, to_col, moved_by, enterprise_id) VALUES (?,?,?,?,?)',
      [id, null, column, req.user.id, req.enterpriseId]
    );
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) {
    console.error('createCard error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateCard = async (req, res) => {
  const { title, column, priority, assignee, due } = req.body;
  try {
    const [check] = await KanbanCard.findById(req.params.id);
    if (!check.length) return res.status(404).json({ success: false, message: 'Card not found' });

    const oldCol = check[0].col_name;
    await KanbanCard.update(req.params.id, { title, column, priority, assignee, due });

    // Log column move if column changed
    if (column && column !== oldCol) {
      await db.query(
        'INSERT INTO kanban_card_history (card_id, from_col, to_col, moved_by, enterprise_id) VALUES (?,?,?,?,?)',
        [req.params.id, oldCol, column, req.user.id, req.enterpriseId || check[0].enterprise_id]
      );
    }

    const [r] = await KanbanCard.findById(req.params.id);
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('updateCard error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteCard = async (req, res) => {
  try {
    const [result] = await KanbanCard.delete(req.params.id);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Card not found' });
    res.json({ success: true, message: 'Card deleted' });
  } catch (err) {
    console.error('deleteCard error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getBoard, createCard, updateCard, deleteCard };