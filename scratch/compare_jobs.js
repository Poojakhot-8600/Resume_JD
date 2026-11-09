const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DIRECT_URL });

async function check() {
  const jobs = await pool.query('SELECT position_id, job_title, status, "createdBy" FROM jobs LIMIT 10');
  console.log('jobs rows:', jobs.rows);

  const jds = await pool.query('SELECT id, job_code, job_title, created_at FROM job_descriptions LIMIT 10');
  console.log('job_descriptions rows:', jds.rows);

  pool.end();
}

check().catch(e => { console.error(e); pool.end(); });

