const fs = require('fs');
const { Pool } = require('pg');

if (fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('Running migration to allow null/default user_id on upload_batches...');

  // 1. Alter column user_id to drop NOT NULL and set default 'system'
  await pool.query(`
    ALTER TABLE upload_batches ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE upload_batches ALTER COLUMN user_id SET DEFAULT 'system';
  `);

  // 2. Create trigger to automatically replace null or empty user_id with 'system'
  await pool.query(`
    CREATE OR REPLACE FUNCTION set_default_upload_batch_user_id()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.user_id IS NULL OR NEW.user_id = '' THEN
        NEW.user_id := 'system';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_upload_batches_user_id ON upload_batches;
    CREATE TRIGGER trg_upload_batches_user_id
    BEFORE INSERT OR UPDATE ON upload_batches
    FOR EACH ROW
    EXECUTE FUNCTION set_default_upload_batch_user_id();
  `);

  // 3. Test insert with NULL user_id
  const testId = 'test_null_user_' + Date.now();
  await pool.query(
    `INSERT INTO upload_batches (id, user_id, batch_type, status) VALUES ($1, NULL, 'job', 'processing')`,
    [testId]
  );

  const check = await pool.query('SELECT id, user_id FROM upload_batches WHERE id = $1', [testId]);
  console.log('Successfully inserted with NULL user_id. Stored row:', check.rows[0]);

  // Clean up test row
  await pool.query('DELETE FROM upload_batches WHERE id = $1', [testId]);
  console.log('Cleaned up test row. Migration complete!');

  await pool.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
