const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Logs a system-wide activity.
 * @param {string|null} userId - The ID of the user who performed the action.
 * @param {string} type - The type of activity (e.g., 'invoice', 'deal', 'employee').
 * @param {string} message - A descriptive message of the activity.
 * @param {string} module - The module where the activity occurred (e.g., 'Sales', 'HR').
 */
const logActivity = async (userId, type, message, module, enterpriseId) => {
  try {
    const id = uuidv4();
    await db.query(
      'INSERT INTO activities (id, user_id, type, message, module, enterprise_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, userId || null, type, message, module, enterpriseId || null]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

module.exports = { logActivity };
