const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    await pool.query(`
      ALTER TABLE candidates 
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
      ADD COLUMN IF NOT EXISTS inactive_at timestamp(3) without time zone DEFAULT NULL;
    `);
    console.log("Columns added successfully to candidates");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
