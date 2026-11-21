const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const File = {
  list: (eid) => db.query('SELECT * FROM files WHERE enterprise_id = ? ORDER BY modified DESC', [eid]),
  findById: (id) => db.query('SELECT * FROM files WHERE id = ?', [id]),

  create: ({ name, size, type, folder, enterpriseId }) => {
    const id = uuidv4();
    return db.query(
      "INSERT INTO files (id, name, size, type, owner, folder, modified, enterprise_id) VALUES (?,?,?,?,?,?,CURDATE(),?)",
      [id, name, size || 0, type || 'other', 'Admin', folder || 'Root', enterpriseId || null]
    ).then(() => id);
  },

  delete: (id) => db.query('DELETE FROM files WHERE id = ?', [id]),
};

module.exports = File;
