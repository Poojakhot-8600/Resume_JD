import '@/utils/dns-fix';
import crypto from 'crypto';
import { pool } from '@/database/db';
import { UploadBatchResponse, UploadRecordDetail } from '@/types';

/**
 * Normalizes an n8n webhook response into the standard duplicate detection contract.
 * Returns null if the n8n response does NOT provide explicit count fields.
 */
export function normalizeN8nUploadResponse(
  n8nData: any,
  httpStatus: number,
  submittedItems: Array<{ file_name: string; file_type?: string; text: string; [key: string]: any }>,
  type: 'job' | 'candidate'
): UploadBatchResponse | null {
  const itemLabelSingular = type === 'job' ? 'job description' : 'candidate resume';
  const itemLabelPlural = type === 'job' ? 'job descriptions' : 'candidate resumes';
  const total = submittedItems.length;

  // 1. Check for HTTP or n8n error responses
  if (httpStatus >= 400 || (n8nData && typeof n8nData === 'object' && (n8nData.code === 0 || n8nData.error))) {
    const errorMsg =
      n8nData?.message ||
      n8nData?.error ||
      `n8n webhook execution failed with status ${httpStatus}.`;

    return {
      success: false,
      message: `Upload failed: ${errorMsg}`,
      total_received: total,
      inserted_count: 0,
      duplicate_count: 0,
      failed_count: total,
      inserted_records: [],
      duplicate_records: [],
      failed_records: submittedItems.map((item) => ({
        file_name: item.file_name,
        error: errorMsg,
        text: item.text,
      })),
    };
  }

  // 2. Unwrap if n8n returned an array of items [ { ... } ]
  let payload = n8nData;
  if (Array.isArray(payload)) {
    if (payload.length === 1 && typeof payload[0] === 'object') {
      payload = payload[0];
    } else if (payload.length > 1 && payload.every((p) => p && typeof p === 'object' && ('status' in p || 'is_duplicate' in p))) {
      // Array of individual item results: [ { file_name: 'a.pdf', status: 'inserted' }, ... ]
      const inserted_records: UploadRecordDetail[] = [];
      const duplicate_records: UploadRecordDetail[] = [];
      const failed_records: UploadRecordDetail[] = [];

      for (const item of payload) {
        const status = (item.status || (item.is_duplicate ? 'duplicate' : 'inserted')).toLowerCase();
        if (status === 'inserted' || status === 'success') {
          inserted_records.push({ ...item, status: 'inserted' });
        } else if (status === 'duplicate' || status === 'skipped') {
          duplicate_records.push({ ...item, status: 'duplicate' });
        } else {
          failed_records.push({ ...item, status: 'failed' });
        }
      }

      const inserted_count = inserted_records.length;
      const duplicate_count = duplicate_records.length;
      const failed_count = failed_records.length;
      const total_received = inserted_count + duplicate_count + failed_count;

      const message = formatContractMessage(inserted_count, duplicate_count, failed_count, itemLabelSingular, itemLabelPlural);

      return {
        success: inserted_count > 0 || (duplicate_count > 0 && failed_count === 0),
        message,
        total_received,
        inserted_count,
        duplicate_count,
        failed_count,
        inserted_records,
        duplicate_records,
        failed_records,
      };
    }
  }

  // Check nested data wrapper if present (e.g. { data: { inserted_count: 2 } })
  if (payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object') {
    if ('inserted_count' in payload.data || 'insertedCount' in payload.data) {
      payload = payload.data;
    }
  }

  // 3. Check if payload contains the contract count fields
  if (
    payload &&
    typeof payload === 'object' &&
    ('inserted_count' in payload ||
      'insertedCount' in payload ||
      'duplicate_count' in payload ||
      'duplicateCount' in payload)
  ) {
    const inserted_count = Number(payload.inserted_count ?? payload.insertedCount ?? 0);
    const duplicate_count = Number(payload.duplicate_count ?? payload.duplicateCount ?? 0);
    const failed_count = Number(payload.failed_count ?? payload.failedCount ?? 0);
    const total_received = Number(payload.total_received ?? payload.totalReceived ?? total);

    const inserted_records: UploadRecordDetail[] = Array.isArray(payload.inserted_records || payload.insertedRecords)
      ? (payload.inserted_records || payload.insertedRecords).map((r: any) => ({ ...r, status: 'inserted' }))
      : [];

    const duplicate_records: UploadRecordDetail[] = Array.isArray(payload.duplicate_records || payload.duplicateRecords)
      ? (payload.duplicate_records || payload.duplicateRecords).map((r: any) => ({ ...r, status: 'duplicate' }))
      : [];

    const failed_records: UploadRecordDetail[] = Array.isArray(payload.failed_records || payload.failedRecords)
      ? (payload.failed_records || payload.failedRecords).map((r: any) => ({ ...r, status: 'failed' }))
      : [];

    const message =
      typeof payload.message === 'string' && payload.message.trim().length > 0
        ? payload.message
        : formatContractMessage(inserted_count, duplicate_count, failed_count, itemLabelSingular, itemLabelPlural);

    const success =
      typeof payload.success === 'boolean'
        ? payload.success
        : inserted_count > 0 || (duplicate_count > 0 && failed_count === 0);

    return {
      success,
      message,
      total_received,
      inserted_count,
      duplicate_count,
      failed_count,
      inserted_records,
      duplicate_records,
      failed_records,
    };
  }

  // n8n did not provide explicit counts (e.g. {"message": "Workflow was started"} or arbitrary JSON)
  return null;
}

/**
 * Checks submitted Job Descriptions against Supabase (job_descriptions table)
 * for duplicates based on content_hash (sha256), job_code, or exact text.
 */
export async function checkJdDuplicatesInSupabase(
  submittedItems: Array<{ file_name: string; file_type?: string; text: string; [key: string]: any }>
): Promise<UploadBatchResponse> {
  const inserted_records: UploadRecordDetail[] = [];
  const duplicate_records: UploadRecordDetail[] = [];
  const failed_records: UploadRecordDetail[] = [];

  const seenHashesInBatch = new Set<string>();

  for (const item of submittedItems) {
    const textVal = (item.text || '').trim();
    if (!textVal) {
      failed_records.push({
        file_name: item.file_name,
        error: 'Document text is empty or could not be extracted.',
        status: 'failed',
      });
      continue;
    }

    const sha256 = crypto.createHash('sha256').update(textVal).digest('hex');

    // 1. Check intra-batch duplication
    if (seenHashesInBatch.has(sha256)) {
      duplicate_records.push({
        file_name: item.file_name,
        text: textVal,
        reason: 'Duplicate file within the same upload batch.',
        status: 'duplicate',
      });
      continue;
    }
    seenHashesInBatch.add(sha256);

    // 2. Extract potential job code from title or text
    const codeMatch =
      item.file_name.match(/(J\d{3,4}|ADM-\d{3}|[A-Z]{2,5}-\d{2,4})/i) ||
      textVal.match(/(?:Job Code|Position ID|Req ID|Code)[\s:-]+([A-Z0-9-]+)/i);
    const candidateCode = codeMatch ? codeMatch[1].trim() : null;

    // Extract title if present
    const firstLine = textVal.split('\n')[0].replace(/[#*_-]/g, '').trim();
    const candidateTitle = item.file_name.replace(/\.[^/.]+$/, '').trim() || firstLine.slice(0, 100);

    try {
      // Query Supabase job_descriptions for matching content_hash, job_code, or text
      const queryRes = await pool.query(
        `SELECT content_hash, job_code, job_title 
         FROM job_descriptions 
         WHERE content_hash = $1 
            OR (job_code IS NOT NULL AND $2::text IS NOT NULL AND TRIM(LOWER(job_code)) = TRIM(LOWER($2)))
            OR jd_text = $3
         LIMIT 1;`,
        [sha256, candidateCode, textVal]
      );

      if (queryRes.rows.length > 0) {
        const existing = queryRes.rows[0];
        duplicate_records.push({
          file_name: item.file_name,
          job_code: existing.job_code || candidateCode || 'N/A',
          job_title: existing.job_title || candidateTitle,
          text: textVal,
          reason: existing.job_code
            ? `Job description with code "${existing.job_code}" already exists in Supabase.`
            : 'Exact job description content already exists in Supabase.',
          status: 'duplicate',
        });
      } else {
        inserted_records.push({
          file_name: item.file_name,
          job_code: candidateCode || 'New JD',
          job_title: candidateTitle,
          text: textVal,
          file_type: item.file_type,
          wordCount: textVal.split(/\s+/).filter(Boolean).length,
          charCount: textVal.length,
          status: 'inserted',
        });
      }
    } catch (err: any) {
      console.error('[Supabase JD duplicate check error]:', err);
      // If db check fails, fallback to treat as new rather than failing the upload
      inserted_records.push({
        file_name: item.file_name,
        job_code: candidateCode || 'New JD',
        job_title: candidateTitle,
        text: textVal,
        status: 'inserted',
      });
    }
  }

  const inserted_count = inserted_records.length;
  const duplicate_count = duplicate_records.length;
  const failed_count = failed_records.length;
  const total_received = submittedItems.length;

  const message = formatContractMessage(
    inserted_count,
    duplicate_count,
    failed_count,
    'job description',
    'job descriptions'
  );

  return {
    success: inserted_count > 0 || (duplicate_count > 0 && failed_count === 0),
    message,
    total_received,
    inserted_count,
    duplicate_count,
    failed_count,
    inserted_records,
    duplicate_records,
    failed_records,
  };
}

/**
 * Checks submitted Candidate Resumes against Supabase (candidates table)
 * for duplicates based on email, content_hash, candidate_key, or text.
 */
export async function checkCandidateDuplicatesInSupabase(
  submittedItems: Array<{ file_name: string; file_type?: string; text: string; [key: string]: any }>
): Promise<UploadBatchResponse> {
  const inserted_records: UploadRecordDetail[] = [];
  const duplicate_records: UploadRecordDetail[] = [];
  const failed_records: UploadRecordDetail[] = [];

  const seenEmailsInBatch = new Set<string>();
  const seenHashesInBatch = new Set<string>();

  for (const item of submittedItems) {
    const textVal = (item.text || '').trim();
    if (!textVal) {
      failed_records.push({
        file_name: item.file_name,
        error: 'Resume text is empty or could not be extracted.',
        status: 'failed',
      });
      continue;
    }

    const sha256 = crypto.createHash('sha256').update(textVal).digest('hex');

    // Extract email from text
    const emailMatch = textVal.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const candidateEmail = emailMatch ? emailMatch[0].toLowerCase().trim() : null;

    // Extract candidate name from filename or first line
    const fallbackName = item.file_name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();

    // 1. Intra-batch duplicate check
    if (seenHashesInBatch.has(sha256) || (candidateEmail && seenEmailsInBatch.has(candidateEmail))) {
      duplicate_records.push({
        file_name: item.file_name,
        candidate_name: fallbackName,
        candidate_email: candidateEmail || 'No Email',
        reason: candidateEmail
          ? `Candidate with email "${candidateEmail}" duplicated in same batch.`
          : 'Duplicate resume file within the same upload batch.',
        status: 'duplicate',
      });
      continue;
    }
    seenHashesInBatch.add(sha256);
    if (candidateEmail) seenEmailsInBatch.add(candidateEmail);

    try {
      // Query Supabase candidates table for matching email, content_hash, or resume_text
      const queryRes = await pool.query(
        `SELECT id, candidate_id, candidate_fname, candidate_lname, candidate_email 
         FROM candidates 
         WHERE ($1::text IS NOT NULL AND LOWER(TRIM(candidate_email)) = $1)
            OR content_hash = $2
            OR resume_text = $3
         LIMIT 1;`,
        [candidateEmail, sha256, textVal]
      );

      if (queryRes.rows.length > 0) {
        const existing = queryRes.rows[0];
        const fullName = [existing.candidate_fname, existing.candidate_lname].filter(Boolean).join(' ') || fallbackName;
        duplicate_records.push({
          file_name: item.file_name,
          candidate_id: existing.candidate_id || existing.id,
          candidate_name: fullName,
          candidate_email: existing.candidate_email || candidateEmail || 'N/A',
          reason: existing.candidate_email
            ? `Candidate with email "${existing.candidate_email}" already exists in Supabase.`
            : 'Candidate resume already exists in Supabase.',
          status: 'duplicate',
        });
      } else {
        inserted_records.push({
          file_name: item.file_name,
          candidate_name: fallbackName,
          candidate_email: candidateEmail || 'Email not detected',
          text: textVal,
          file_type: item.file_type,
          wordCount: textVal.split(/\s+/).filter(Boolean).length,
          charCount: textVal.length,
          status: 'inserted',
        });
      }
    } catch (err: any) {
      console.error('[Supabase Candidate duplicate check error]:', err);
      inserted_records.push({
        file_name: item.file_name,
        candidate_name: fallbackName,
        candidate_email: candidateEmail || 'N/A',
        text: textVal,
        status: 'inserted',
      });
    }
  }

  const inserted_count = inserted_records.length;
  const duplicate_count = duplicate_records.length;
  const failed_count = failed_records.length;
  const total_received = submittedItems.length;

  const message = formatContractMessage(
    inserted_count,
    duplicate_count,
    failed_count,
    'candidate resume',
    'candidate resumes'
  );

  return {
    success: inserted_count > 0 || (duplicate_count > 0 && failed_count === 0),
    message,
    total_received,
    inserted_count,
    duplicate_count,
    failed_count,
    inserted_records,
    duplicate_records,
    failed_records,
  };
}

function formatContractMessage(
  inserted: number,
  duplicate: number,
  failed: number,
  singular: string,
  plural: string
): string {
  const parts: string[] = [];

  if (inserted > 0) {
    parts.push(`${inserted} ${inserted === 1 ? singular : plural} inserted successfully`);
  }
  if (duplicate > 0) {
    parts.push(`${duplicate} duplicate ${duplicate === 1 ? singular : plural} skipped`);
  }
  if (failed > 0) {
    parts.push(`${failed} ${failed === 1 ? singular : plural} failed`);
  }

  if (parts.length === 0) {
    return `No ${plural} processed.`;
  }

  return parts.join('; ') + '.';
}
