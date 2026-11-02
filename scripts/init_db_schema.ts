import 'dotenv/config';
import '../src/utils/dns-fix';
import { pool } from '../src/database/db';

async function main() {
  console.log('--- Initializing database schema on target PostgreSQL database ---');

  try {
    // 1. Enums
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE "Role" AS ENUM ('ADMIN', 'RECRUITER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "AssessmentStatus" AS ENUM ('INVITED', 'SHORTLISTED', 'SCHEDULED', 'STARTED', 'COMPLETED', 'EVALUATED', 'EXPIRED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ Enums verified.');

    // 2. User table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        role "Role" NOT NULL DEFAULT 'RECRUITER',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "idx_user_email" ON "User"(email);
    `);
    console.log('✅ User table verified.');

    // 3. Jobs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "jobs" (
        position_id BIGINT PRIMARY KEY,
        job_title VARCHAR(255),
        jd VARCHAR(2000),
        status VARCHAR(20),
        skills JSONB,
        must_have JSONB,
        good_to_have JSONB,
        experience TEXT,
        seniority TEXT,
        topics JSONB,
        weights JSONB,
        mcqs JSONB,
        mcq_count INTEGER DEFAULT 0,
        error_message VARCHAR(255),
        department TEXT NOT NULL DEFAULT 'General',
        location TEXT NOT NULL DEFAULT 'Remote',
        "createdBy" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "idx_jobs_created_by" ON "jobs"("createdBy");
      CREATE INDEX IF NOT EXISTS "idx_jobs_status" ON "jobs"(status);
    `);
    console.log('✅ jobs table verified.');

    // 4. QuestionBank table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "QuestionBank" (
        id TEXT PRIMARY KEY,
        position_id BIGINT NOT NULL REFERENCES "jobs"(position_id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        topic TEXT NOT NULL,
        options JSONB,
        answer TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "idx_questionbank_position_id" ON "QuestionBank"(position_id);
    `);
    console.log('✅ QuestionBank table verified.');

    // 5. Candidates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "candidates" (
        id TEXT PRIMARY KEY,
        position_id BIGINT NOT NULL REFERENCES "jobs"(position_id) ON DELETE CASCADE,
        candidate_id TEXT,
        candidate_fname VARCHAR(100) NOT NULL,
        candidate_lname VARCHAR(100) NOT NULL,
        candidate_email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        phone TEXT,
        "assessmentStatus" "AssessmentStatus" DEFAULT 'INVITED',
        "assessmentToken" TEXT UNIQUE,
        "inviteSentAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        years_of_experience DECIMAL,
        current_job_title VARCHAR,
        current_company VARCHAR,
        skills JSONB,
        summary TEXT,
        resume_text TEXT,
        resume_url TEXT,
        status TEXT DEFAULT 'Active',
        inactive_at TIMESTAMP(3)
      );
      CREATE INDEX IF NOT EXISTS "idx_candidates_position_id" ON "candidates"(position_id);
      CREATE INDEX IF NOT EXISTS "idx_candidates_assessment_status" ON "candidates"("assessmentStatus");
      CREATE INDEX IF NOT EXISTS "idx_candidates_assessment_token" ON "candidates"("assessmentToken");
    `);
    console.log('✅ candidates table verified.');

    // 6. Slot table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Slot" (
        id TEXT PRIMARY KEY,
        "startTime" TIMESTAMP(3) NOT NULL,
        "endTime" TIMESTAMP(3) NOT NULL,
        capacity INTEGER NOT NULL,
        "bookedCount" INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Slot table verified.');

    // 7. SlotBooking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "SlotBooking" (
        id TEXT PRIMARY KEY,
        "candidateId" TEXT UNIQUE NOT NULL REFERENCES "candidates"(id) ON DELETE CASCADE,
        "slotId" TEXT NOT NULL REFERENCES "Slot"(id) ON DELETE CASCADE,
        "reminderSent" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ SlotBooking table verified.');

    // 8. Assessment table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Assessment" (
        id TEXT PRIMARY KEY,
        "candidateId" TEXT UNIQUE NOT NULL REFERENCES "candidates"(id) ON DELETE CASCADE,
        job_id BIGINT NOT NULL,
        questions JSONB NOT NULL,
        "assignedQuestionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
        answers JSONB,
        score DOUBLE PRECISION,
        percentage DOUBLE PRECISION,
        "evaluationData" JSONB,
        "completedAt" TIMESTAMP(3)
      );
      CREATE INDEX IF NOT EXISTS "idx_assessment_candidate_id" ON "Assessment"("candidateId");
      CREATE INDEX IF NOT EXISTS "idx_assessment_job_id" ON "Assessment"(job_id);
    `);
    console.log('✅ Assessment table verified.');

    // 9. upload_batches table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS upload_batches (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) DEFAULT 'system',
        batch_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'processing',
        total_received INTEGER NOT NULL DEFAULT 0,
        inserted_count INTEGER NOT NULL DEFAULT 0,
        duplicate_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        message TEXT,
        inserted_records JSONB NOT NULL DEFAULT '[]'::jsonb,
        duplicate_records JSONB NOT NULL DEFAULT '[]'::jsonb,
        failed_records JSONB NOT NULL DEFAULT '[]'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_upload_batches_user_id ON upload_batches(user_id);
      CREATE INDEX IF NOT EXISTS idx_upload_batches_status ON upload_batches(status);
    `);
    console.log('✅ upload_batches table verified.');

    // 10. job_descriptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_descriptions (
        content_hash VARCHAR(64) PRIMARY KEY,
        job_code VARCHAR(100),
        job_title VARCHAR(255),
        jd_text TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        inactive_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_job_descriptions_code ON job_descriptions(job_code);
    `);
    console.log('✅ job_descriptions table verified.');

    // 11. output table (for candidate matches)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS output (
        id SERIAL PRIMARY KEY,
        resume_id VARCHAR(255),
        candidate_id VARCHAR(255),
        candidate_name VARCHAR(255),
        candidate_email VARCHAR(255),
        job_code VARCHAR(100),
        job_title VARCHAR(255),
        job_seniority VARCHAR(100),
        match_percent REAL,
        band VARCHAR(50),
        coverage_matched INTEGER,
        coverage_total INTEGER,
        coverage_percent REAL,
        coverage_text TEXT,
        score_skills REAL,
        score_experience REAL,
        score_responsibilities REAL,
        score_domain REAL,
        score_seniority REAL,
        score_education REAL,
        dimension_scores JSONB,
        dimension_contributions JSONB,
        matched_skills JSONB,
        gap_skills JSONB,
        knockout_status VARCHAR(50),
        knockout_flags JSONB,
        data_confidence VARCHAR(50),
        recommended_next_step VARCHAR(100),
        explanation TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_output_job_code ON output(job_code);
      CREATE INDEX IF NOT EXISTS idx_output_candidate_id ON output(candidate_id);
    `);
    console.log('✅ output table verified.');

    console.log('\n🎉 ALL DATABASE TABLES CREATED AND READY FOR TESTING!');
  } catch (err: any) {
    console.error('❌ Schema initialization failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
