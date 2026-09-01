// Shared Oracle Cloud MySQL connection pool. Only ever imported by
// server-side Netlify Functions — the database credentials here
// must never reach the browser.
const mysql = require('mysql2/promise');

let pool;
function getPool() {
  if (!pool) {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
      throw new Error('DB_HOST / DB_USER / DB_NAME (and DB_PASSWORD) are not set in Netlify environment variables.');
    }
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      // Oracle Cloud MySQL requires SSL by default. If your instance
      // issued its own CA certificate, replace this with
      // { ca: fs.readFileSync('path/to/ca.pem') } — check the Oracle
      // Cloud console for your instance's exact requirement.
      ssl: { rejectUnauthorized: true },
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return pool;
}

module.exports = { getPool };
