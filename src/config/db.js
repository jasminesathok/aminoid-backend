const mysql = require('mysql2/promise');

function parseConfig() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;
  if (url) {
    const u = new URL(url);
    return {
      host:     u.hostname,
      port:     parseInt(u.port) || 3306,
      user:     u.username,
      password: u.password,
      database: u.pathname.replace('/', ''),
    };
  }
  return {
    host:     process.env.MYSQLHOST     || process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.MYSQLPORT || process.env.DB_PORT) || 3306,
    user:     process.env.MYSQLUSER     || process.env.DB_USER     || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'root',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME     || 'amnoid_db',
  };
}

const pool = mysql.createPool({
  ...parseConfig(),
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
});

// Test connection on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;
