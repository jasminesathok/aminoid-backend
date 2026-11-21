const CalendarEvent = require('../../models/CalendarEvent');
const db            = require('../../config/db');

const getEvents = async (req, res) => {
  try {
    const isSA = req.user.role === 'super_admin';
    let rows;
    if (isSA) {
      // SA: all events across all enterprises, with enterprise name
      [rows] = await db.query(`
        SELECT e.*,
               CONCAT(u.first_name,' ',u.last_name) AS assigner_name,
               u.email AS assigner_email,
               ent.company_name AS enterprise_name,
               ent.first_name   AS ent_first,
               ent.last_name    AS ent_last
        FROM calendar_events e
        LEFT JOIN users u   ON e.user_id      = u.id
        LEFT JOIN users ent ON e.enterprise_id = ent.id
        ORDER BY e.start_dt DESC
      `);
    } else {
      [rows] = await CalendarEvent.list(req.enterpriseId);
    }
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getEvents error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createEvent = async (req, res) => {
  const { title, start, end, type, color, location } = req.body;
  if (!title || !start)
    return res.status(400).json({ success: false, message: 'Title and start are required' });
  try {
    const id = await CalendarEvent.create({
      title, start, end, type, color, location,
      userId:       req.user.id,
      enterpriseId: req.enterpriseId,   // ← was missing from INSERT before
    });
    const [r] = await CalendarEvent.findById(id);
    res.status(201).json({ success: true, data: r[0] });
  } catch (err) {
    console.error('createEvent error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateEvent = async (req, res) => {
  const { title, start, end, type, color, location } = req.body;
  try {
    await CalendarEvent.update(req.params.id, { title, start, end, type, color, location });
    const [r] = await CalendarEvent.findById(req.params.id);
    if (!r.length) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: r[0] });
  } catch (err) {
    console.error('updateEvent error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const [result] = await CalendarEvent.delete(req.params.id);
    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    console.error('deleteEvent error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getEvents, createEvent, updateEvent, deleteEvent };