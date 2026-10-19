-- Migration: Create upload_batches table for asynchronous batch processing
CREATE TABLE IF NOT EXISTS upload_batches (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) DEFAULT 'system',
  batch_type VARCHAR(50) NOT NULL, -- 'candidate' | 'job'
  status VARCHAR(50) NOT NULL DEFAULT 'processing', -- 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'failed'
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

-- Ensure user_id allows null/defaults to 'system'
ALTER TABLE upload_batches ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE upload_batches ALTER COLUMN user_id SET DEFAULT 'system';

-- Trigger: auto-populate empty or null user_id with 'system'
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

CREATE INDEX IF NOT EXISTS idx_upload_batches_user_id ON upload_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_batches_status ON upload_batches(status);
CREATE INDEX IF NOT EXISTS idx_upload_batches_created_at ON upload_batches(created_at DESC);
