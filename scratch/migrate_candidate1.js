const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DIRECT_URL });

async function migrate() {
  console.log('Inspecting candidates columns...');
  const cCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'candidates'");
  console.log('candidates cols:', cCols.rows.map(r => r.column_name));

  console.log('Copying existing candidates into candidate1...');
  await pool.query(`
    INSERT INTO candidate1 (
      id, candidate_id, candidate_fname, candidate_lname, candidate_email, phone,
      current_job_title, current_company, years_of_experience, skills, summary,
      resume_text, resume_url, position_id, assessment_status, assessment_token,
      invite_sent_at, status, inactive_at, created_at
    )
    SELECT
      id::uuid, candidate_id, candidate_fname, candidate_lname, candidate_email, phone,
      current_job_title, current_company, years_of_experience, skills, summary,
      resume_text, resume_url, position_id, "assessmentStatus", "assessmentToken",
      "inviteSentAt", COALESCE(status, 'Active'), inactive_at, created_at
    FROM candidates
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('Candidates copied into candidate1.');

  // Switch foreign keys on Assessment and SlotBooking to point to candidate1(id)
  console.log('Switching Foreign Keys for Assessment and SlotBooking...');
  await pool.query(`ALTER TABLE "Assessment" DROP CONSTRAINT IF EXISTS "Assessment_candidateId_fkey";`);
  await pool.query(`
    ALTER TABLE "Assessment"
    ADD CONSTRAINT "Assessment_candidateId_fkey"
    FOREIGN KEY ("candidateId")
    REFERENCES candidate1(id)
    ON DELETE CASCADE;
  `);

  await pool.query(`ALTER TABLE "SlotBooking" DROP CONSTRAINT IF EXISTS "SlotBooking_candidateId_fkey";`);
  await pool.query(`
    ALTER TABLE "SlotBooking"
    ADD CONSTRAINT "SlotBooking_candidateId_fkey"
    FOREIGN KEY ("candidateId")
    REFERENCES candidate1(id)
    ON DELETE CASCADE;
  `);
  console.log('Foreign keys switched to candidate1(id).');

  const total = await pool.query('SELECT count(*) FROM candidate1');
  console.log('Total candidates in candidate1 now:', total.rows[0].count);

  pool.end();
}

migrate().catch(e => { console.error('Migration error:', e); pool.end(); });
