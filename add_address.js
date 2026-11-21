const db = require('./src/config/db');

async function migrate() {
  try {
    await db.query('ALTER TABLE leads ADD COLUMN address TEXT NULL;');
    console.log('Successfully added address column to leads table');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('address column already exists in leads table');
    } else {
      console.error('Error adding address column:', err);
    }
  }
  process.exit(0);
}

migrate();
