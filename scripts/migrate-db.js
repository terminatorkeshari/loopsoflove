const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Simple .env parser without external dependency
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes('username:password@cluster-name')) {
    console.error('⚠️ DATABASE_URL is not set or has placeholder values.');
    console.log('To run this migration, you can either:');
    console.log('1. Put your actual CockroachDB connection string in .env: DATABASE_URL=postgresql://...');
    console.log('2. Or run: node scripts/migrate-db.js "postgresql://<your-db-url>"');
    
    if (process.argv[2] && process.argv[2].startsWith('postgres')) {
      return executeSql(process.argv[2]);
    }
    process.exit(1);
  }

  await executeSql(dbUrl);
}

async function executeSql(connectionString) {
  const sqlPath = path.join(__dirname, '..', 'mysql', 'migration_hero_carousel_images.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Connecting to database...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('Connected! Running migration SQL...');
    await client.query(sql);
    client.release();
    console.log('✅ Migration executed successfully! The "preset" column and hero banner fields are now created.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
