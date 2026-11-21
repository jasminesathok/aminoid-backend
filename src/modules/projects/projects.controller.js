const db      = require('../../config/db');
const Project = require('../../models/Project');
const Task = require('../../models/Task');
const User = require('../../models/User');
const { logActivity } = require('../../utils/activity');

// ─── Projects ─────────────────────────────────────────────────────────────────

const getProjects = async (req, res) => {
  try {
    let rows;
if (req.user.role === 'super_admin') {
  [rows] = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
} else {
  [rows] = await Project.list(req.enterpriseId);
}
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getProjects error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getProject = async (req, res) => {
  try {
    const [rows] = await Project.findById(req.params.id);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getProject error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createProject = async (req, res) => {
  const { name, status = 'Planning', dueDate, priority = 'Medium', startDate } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Project name is required' });
  try {
    const id = await Project.create({ name, status, priority, dueDate, startDate, enterpriseId: req.enterpriseId });
    const [rows] = await Project.findById(id);
    await logActivity(req.user?.id, 'project', `New project "${name}" created`, 'Projects');
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('createProject error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateProject = async (req, res) => {
  const { name, status, progress, priority, dueDate, startDate } = req.body;
  try {
    await Project.update(req.params.id, { name, status, progress, priority, dueDate, startDate });
    const [rows] = await Project.findById(req.params.id);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('updateProject error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteProject = async (req, res) => {
  try {
    const [result] = await Project.delete(req.params.id);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    console.error('deleteProject error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

const getTasks = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    let rows;
    if (isSA) {
      [rows] = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
    } else {
      [rows] = await Task.list(req.enterpriseId);
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getTasks error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createTask = async (req, res) => {
  const { title, projectId, assigneeId, priority = 'Medium', dueDate } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'Task title is required' });
  try {
    const id = await Task.create({ title, projectId, assigneeId, priority, dueDate, enterpriseId: req.enterpriseId });
    const [rows] = await Task.findById(id);
    await logActivity(req.user?.id, 'task', `New task "${title}" assigned`, 'Projects');
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('createTask error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateTask = async (req, res) => {
  const { title, status, priority, dueDate, assigneeId } = req.body;
  try {
    await Task.update(req.params.id, { title, status, priority, dueDate, assigneeId });
    const [rows] = await Task.findById(req.params.id);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('updateTask error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const [result] = await Task.delete(req.params.id);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    console.error('deleteTask error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Team ─────────────────────────────────────────────────────────────────────

const getTeam = async (req, res) => {
  try {
    const [rows] = await User.listByEnterprise(req.enterpriseId);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getTeam error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const editUser = async (req, res) => {
  try {
    const { firstName, lastName, role } = req.body;
    await db.query(
      'UPDATE users SET first_name=COALESCE(?,first_name), last_name=COALESCE(?,last_name), role=COALESCE(?,role) WHERE id=?',
      [firstName, lastName, role, req.params.id]
    );
    const [[row]] = await db.query(
      'SELECT id, first_name, last_name, email, role, created_at FROM users WHERE id=?',
      [req.params.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('editUser error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const removeUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    const [result] = await db.query('DELETE FROM users WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error('removeUser error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Timeline ─────────────────────────────────────────────────────────────────

const getTimeline = async (req, res) => {
  try {
    const [projects] = await Project.listForTimeline();

    if (!projects.length) return res.json({ success: true, data: [] });

    const projectIds = projects.map(p => p.id);

    const [phases] = await Project.getPhases(projectIds);
    const [milestones] = await Project.getMilestones(projectIds);

    const phasesByProject     = {};
    const milestonesByProject = {};
    phases.forEach(ph => {
      if (!phasesByProject[ph.project_id]) phasesByProject[ph.project_id] = [];
      phasesByProject[ph.project_id].push({ id: ph.id, name: ph.name, start: ph.start_day, dur: ph.duration_days, done: !!ph.done });
    });
    milestones.forEach(ms => {
      if (!milestonesByProject[ms.project_id]) milestonesByProject[ms.project_id] = [];
      milestonesByProject[ms.project_id].push({ id: ms.id, day: ms.day, label: ms.label });
    });

    const data = projects.map(p => ({
      id:         p.id,
      name:       p.name,
      status:     p.status,
      priority:   p.priority,
      progress:   p.progress,
      color:      p.color || '#939BFF',
      startDate:  p.start_date,
      dueDate:    p.due_date,
      phases:     phasesByProject[p.id]     || [],
      milestones: milestonesByProject[p.id] || [],
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('getTimeline error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createPhase = async (req, res) => {
  const { name, startDay, durationDays, done = false } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Phase name is required' });
  try {
    const [proj] = await Project.findById(req.params.id);
    if (!proj.length) return res.status(404).json({ success: false, message: 'Project not found' });

    const id = await Project.createPhase({ projectId: req.params.id, name, startDay, durationDays, done });
    const [rows] = await Project.findPhaseById(id);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('createPhase error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updatePhase = async (req, res) => {
  const { name, startDay, durationDays, done } = req.body;
  try {
    await Project.updatePhase(req.params.phaseId, { name, startDay, durationDays, done });
    const [rows] = await Project.findPhaseById(req.params.phaseId);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Phase not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('updatePhase error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deletePhase = async (req, res) => {
  try {
    const [result] = await Project.deletePhase(req.params.phaseId);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Phase not found' });
    res.json({ success: true, message: 'Phase deleted' });
  } catch (err) {
    console.error('deletePhase error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createMilestone = async (req, res) => {
  const { day, label } = req.body;
  if (!label) return res.status(400).json({ success: false, message: 'Milestone label is required' });
  try {
    const [proj] = await Project.findById(req.params.id);
    if (!proj.length) return res.status(404).json({ success: false, message: 'Project not found' });

    const id = await Project.createMilestone({ projectId: req.params.id, day, label });
    const [rows] = await Project.findMilestoneById(id);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('createMilestone error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteMilestone = async (req, res) => {
  try {
    const [result] = await Project.deleteMilestone(req.params.milestoneId);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Milestone not found' });
    res.json({ success: true, message: 'Milestone deleted' });
  } catch (err) {
    console.error('deleteMilestone error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getProjects, getProject, createProject, updateProject, deleteProject,
  getTasks, createTask, updateTask, deleteTask,
  getTeam, editUser, removeUser,
  getTimeline,
  createPhase, updatePhase, deletePhase,
  createMilestone, deleteMilestone,
};
