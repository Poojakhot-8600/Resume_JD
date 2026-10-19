const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes('localhost') &&
      !process.env.DATABASE_URL.includes('127.0.0.1')
        ? { rejectUnauthorized: false }
        : undefined,
  });

  const sqlPath = path.join(__dirname, '..', 'prisma', 'migrations', 'upload_batches.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running upload_batches migration against database...');
  await pool.query(sql);
  console.log('Migration completed successfully!');

  // Verify table
  const check = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'upload_batches' ORDER BY ordinal_position"
  );
  console.log('Verified upload_batches columns:', check.rows.map(r => `${r.column_name} (${r.data_type})`));

  await pool.end();
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
