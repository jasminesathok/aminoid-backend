const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const CalendarEvent = {

  list: (enterpriseId) =>
    db.query(
      `SELECT e.*,
              CONCAT(u.first_name,' ',u.last_name) AS assigner_name,
              u.email AS assigner_email
       FROM calendar_events e
       LEFT JOIN users u ON e.user_id = u.id
       WHERE e.enterprise_id = ?
       ORDER BY e.start_dt`,
      [enterpriseId]
    ),

  findById: (id) =>
    db.query(
      `SELECT e.*,
              CONCAT(u.first_name,' ',u.last_name) AS assigner_name,
              u.email AS assigner_email,
              ent.company_name AS enterprise_name
       FROM calendar_events e
       LEFT JOIN users u   ON e.user_id       = u.id
       LEFT JOIN users ent ON e.enterprise_id  = ent.id
       WHERE e.id = ?`,
      [id]
    ),

  // ── FIX: enterprise_id was missing from INSERT ──────────────────────────
  create: ({ title, start, end, type, color, location, userId, enterpriseId }) => {
    const id = uuidv4();
    return db.query(
      'INSERT INTO calendar_events (id, title, start_dt, end_dt, type, color, location, user_id, enterprise_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, title, start, end || null, type || 'event', color || '#6366f1', location || null, userId, enterpriseId]
    ).then(() => id);
  },

  update: (id, { title, start, end, type, color, location }) =>
    db.query(
      'UPDATE calendar_events SET title=COALESCE(?,title), start_dt=COALESCE(?,start_dt), end_dt=COALESCE(?,end_dt), type=COALESCE(?,type), color=COALESCE(?,color), location=COALESCE(?,location) WHERE id=?',
      [title, start, end, type, color, location, id]
    ),

  delete: (id) => db.query('DELETE FROM calendar_events WHERE id = ?', [id]),
};

module.exports = CalendarEvent;