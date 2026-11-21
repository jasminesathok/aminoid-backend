const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Project = {
  list: (eid) => db.query('SELECT * FROM projects WHERE enterprise_id = ? ORDER BY created_at DESC', [eid]),
  findById: (id) => db.query('SELECT * FROM projects WHERE id = ?', [id]),
  count: (eid) => eid
  ? db.query('SELECT COUNT(*) AS c FROM projects WHERE enterprise_id = ?', [eid])
  : db.query('SELECT COUNT(*) AS c FROM projects'),

countByStatus: (status, eid) => eid
  ? db.query('SELECT COUNT(*) AS c FROM projects WHERE status = ? AND enterprise_id = ?', [status, eid])
  : db.query('SELECT COUNT(*) AS c FROM projects WHERE status = ?', [status]),

  create: ({ name, status = 'Planning', priority = 'Medium', dueDate, startDate, enterpriseId }) => {
    const id = uuidv4();
    return db.query(
      'INSERT INTO projects (id, name, status, progress, priority, due_date, start_date, enterprise_id) VALUES (?,?,?,0,?,?,?,?)',
      [id, name, status, priority, dueDate || null, startDate || null, enterpriseId || null]
    ).then(() => id);
  },

  update: (id, { name, status, progress, priority, dueDate, startDate }) =>
    db.query(
      'UPDATE projects SET name=COALESCE(?,name), status=COALESCE(?,status), progress=COALESCE(?,progress), priority=COALESCE(?,priority), due_date=COALESCE(?,due_date), start_date=COALESCE(?,start_date) WHERE id=?',
      [name, status, progress, priority, dueDate, startDate, id]
    ),

  delete: (id) => db.query('DELETE FROM projects WHERE id = ?', [id]),

  // Timeline
  listForTimeline: () => db.query('SELECT * FROM projects ORDER BY start_date ASC, created_at ASC'),
  getPhases:       (projectIds) => db.query(`SELECT * FROM project_phases WHERE project_id IN (${projectIds.map(() => '?').join(',')}) ORDER BY start_day ASC`, projectIds),
  getMilestones:   (projectIds) => db.query(`SELECT * FROM project_milestones WHERE project_id IN (${projectIds.map(() => '?').join(',')}) ORDER BY day ASC`, projectIds),

  // Phases
  findPhaseById: (id) => db.query('SELECT * FROM project_phases WHERE id = ?', [id]),
  createPhase: ({ projectId, name, startDay, durationDays, done }) => {
    const id = uuidv4();
    return db.query(
      'INSERT INTO project_phases (id, project_id, name, start_day, duration_days, done) VALUES (?,?,?,?,?,?)',
      [id, projectId, name, startDay || 1, durationDays || 7, done ? 1 : 0]
    ).then(() => id);
  },
  updatePhase: (id, { name, startDay, durationDays, done }) =>
    db.query(
      'UPDATE project_phases SET name=COALESCE(?,name), start_day=COALESCE(?,start_day), duration_days=COALESCE(?,duration_days), done=COALESCE(?,done) WHERE id=?',
      [name, startDay, durationDays, done !== undefined ? (done ? 1 : 0) : null, id]
    ),
  deletePhase: (id) => db.query('DELETE FROM project_phases WHERE id = ?', [id]),

  // Milestones
  findMilestoneById: (id) => db.query('SELECT * FROM project_milestones WHERE id = ?', [id]),
  createMilestone: ({ projectId, day, label }) => {
    const id = uuidv4();
    return db.query(
      'INSERT INTO project_milestones (id, project_id, day, label) VALUES (?,?,?,?)',
      [id, projectId, day || 1, label]
    ).then(() => id);
  },
  deleteMilestone: (id) => db.query('DELETE FROM project_milestones WHERE id = ?', [id]),
};

module.exports = Project;
