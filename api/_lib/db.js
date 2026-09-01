const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// Some functions do `const pool = require('./_lib/db')`, others do
// `const { getPool } = require('./_lib/db')` then `getPool()`. Support
// both so nothing crashes on "getPool is not a function" — instead of
// editing every consumer, attach getPool as a property of the pool
// itself, since a Pool instance can hold extra properties fine.
pool.getPool = () => pool;

module.exports = pool;
