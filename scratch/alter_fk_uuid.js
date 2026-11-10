const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DIRECT_URL });

async function migrate() {
  console.log('Altering Assessment.candidateId and SlotBooking.candidateId to UUID...');
  await pool.query(`ALTER TABLE "Assessment" ALTER COLUMN "candidateId" TYPE uuid USING "candidateId"::uuid;`);
  await pool.query(`ALTER TABLE "SlotBooking" ALTER COLUMN "candidateId" TYPE uuid USING "candidateId"::uuid;`);

  console.log('Adding foreign key constraints pointing to candidate1(id)...');
  await pool.query(`
    ALTER TABLE "Assessment"
    ADD CONSTRAINT "Assessment_candidateId_fkey"
    FOREIGN KEY ("candidateId")
    REFERENCES candidate1(id)
    ON DELETE CASCADE;
  `);

  await pool.query(`
    ALTER TABLE "SlotBooking"
    ADD CONSTRAINT "SlotBooking_candidateId_fkey"
    FOREIGN KEY ("candidateId")
    REFERENCES candidate1(id)
    ON DELETE CASCADE;
  `);

  console.log('Foreign keys switched successfully to candidate1(id)!');
  const total = await pool.query('SELECT count(*) FROM candidate1');
  console.log('Total candidates in candidate1:', total.rows[0].count);
  pool.end();
}

migrate().catch(e => { console.error('Migration error:', e); pool.end(); });

