const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Task = {
  list: (eid) => db.query('SELECT * FROM tasks WHERE enterprise_id = ? ORDER BY created_at DESC', [eid]),
  findById: (id) => db.query('SELECT * FROM tasks WHERE id = ?', [id]),
  count: (eid) => db.query('SELECT COUNT(*) AS c FROM tasks WHERE enterprise_id = ?', [eid]),
  countByStatus: (status, eid) => db.query('SELECT COUNT(*) AS c FROM tasks WHERE status = ? AND enterprise_id = ?', [status, eid]),

  create: ({ title, projectId, assigneeId, priority = 'Medium', dueDate, enterpriseId }) => {
    const id = uuidv4();
    return db.query(
      "INSERT INTO tasks (id, title, project_id, assignee_id, status, priority, due_date, enterprise_id) VALUES (?,?,?,?,'Todo',?,?,?)",
      [id, title, projectId || null, assigneeId || null, priority, dueDate || null, enterpriseId || null]
    ).then(() => id);
  },

  update: (id, { title, status, priority, dueDate, assigneeId }) =>
    db.query(
      'UPDATE tasks SET title=COALESCE(?,title), status=COALESCE(?,status), priority=COALESCE(?,priority), due_date=COALESCE(?,due_date), assignee_id=COALESCE(?,assignee_id) WHERE id=?',
      [title, status, priority, dueDate, assigneeId, id]
    ),

  delete: (id) => db.query('DELETE FROM tasks WHERE id = ?', [id]),
};

module.exports = Task;
