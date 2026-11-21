const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const KanbanCard = {
  list: (eid) => db.query(
    'SELECT * FROM kanban_cards WHERE enterprise_id = ? ORDER BY col_name, position', [eid]
  ),

  findById: (id) => db.query('SELECT * FROM kanban_cards WHERE id = ?', [id]),

  create: ({ title, column, priority, assignee, due, enterpriseId, createdBy }) => {
    const id = uuidv4();
    return db.query(
      'INSERT INTO kanban_cards (id, title, col_name, priority, assignee, due_date, enterprise_id, created_by) VALUES (?,?,?,?,?,?,?,?)',
      [id, title, column || 'Todo', priority || 'Medium', assignee || null, due || null, enterpriseId || null, createdBy || null]
    ).then(() => id);
  },

  update: (id, { title, column, priority, assignee, due }) =>
    db.query(
      'UPDATE kanban_cards SET title=COALESCE(?,title), col_name=COALESCE(?,col_name), priority=COALESCE(?,priority), assignee=COALESCE(?,assignee), due_date=COALESCE(?,due_date) WHERE id=?',
      [title, column, priority, assignee, due || null, id]
    ),

  delete: (id) => db.query('DELETE FROM kanban_cards WHERE id = ?', [id]),
};

module.exports = KanbanCard;