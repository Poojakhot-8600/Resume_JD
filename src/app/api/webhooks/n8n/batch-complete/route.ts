import '@/utils/dns-fix';
import { NextResponse } from 'next/server';
import { updateBatchStatus, getBatchById, formatBatchResultMessage } from '@/services/batchService';
import { BatchStatus, UploadRecordDetail } from '@/types';

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.N8N_SHARED_SECRET || '';
    const clientSecret =
      request.headers.get('x-webhook-secret') ||
      request.headers.get('x-n8n-secret') ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    const { verifyTimingSafeSecret } = await import('@/services/authz');
    if (!verifyTimingSafeSecret(clientSecret, webhookSecret)) {
      return NextResponse.json({ error: 'Unauthorized webhook request.' }, { status: 401 });
    }

    const body = await request.json();
    const batchId = body.batch_id || body.batchId || body.id;

    if (!batchId || typeof batchId !== 'string') {
      return NextResponse.json({ error: 'Missing batch_id in payload.' }, { status: 400 });
    }

    const { batch } = await getBatchById(batchId);
    if (!batch) {
      return NextResponse.json({ error: `Batch "${batchId}" not found.` }, { status: 404 });
    }

    const inserted_records: UploadRecordDetail[] =
      body.inserted_records ||
      body.inserted_candidates ||
      body.inserted_job_descriptions ||
      [];
    const duplicate_records: UploadRecordDetail[] =
      body.duplicate_records ||
      body.duplicate_candidates ||
      body.duplicate_job_descriptions ||
      [];
    const failed_records: UploadRecordDetail[] =
      body.failed_records ||
      body.failed_candidates ||
      body.failed_job_descriptions ||
      [];

    const inserted_count = Number(
      body.inserted_count ?? body.insertedCount ?? inserted_records.length
    );
    const duplicate_count = Number(
      body.duplicate_count ?? body.duplicateCount ?? duplicate_records.length
    );
    const failed_count = Number(
      body.failed_count ?? body.failedCount ?? failed_records.length
    );

    let status: BatchStatus = body.status as BatchStatus;
    if (!status) {
      if (failed_count > 0 && inserted_count === 0 && duplicate_count === 0) {
        status = 'failed';
      } else if (failed_count > 0) {
        status = 'completed_with_errors';
      } else {
        status = 'completed';
      }
    }

    const batchType = (batch as any).batch_type || 'candidate';
    const message =
      body.message ||
      formatBatchResultMessage(
        inserted_count,
        duplicate_count,
        failed_count,
        batchType === 'job' ? 'job' : 'candidate'
      );

    await updateBatchStatus(batchId, {
      status,
      inserted_count,
      duplicate_count,
      failed_count,
      message,
      inserted_records,
      duplicate_records,
      failed_records,
      metadata: body.metadata,
    });

    // Stamp created_by = batch.user_id on records from this batch to preserve recruiter privacy
    const batchUserId = (batch as any).user_id;
    if (batchUserId && batchUserId !== 'system') {
      const { pool } = await import('@/database/db');
      if (batchType === 'job') {
        const codes = inserted_records.map((r: any) => r.job_code).filter(Boolean);
        if (codes.length > 0) {
          await pool.query(
            `UPDATE job_descriptions SET created_by = $1 WHERE job_code = ANY($2::text[]) AND (created_by IS NULL OR created_by = 'seeded-admin-user-id')`,
            [batchUserId, codes]
          ).catch(() => {});
        }
      } else {
        const emails = inserted_records.map((r: any) => r.candidate_email).filter(Boolean);
        if (emails.length > 0) {
          await pool.query(
            `UPDATE candidates SET created_by = $1 WHERE LOWER(candidate_email) = ANY($2::text[]) AND (created_by IS NULL OR created_by = 'seeded-admin-user-id')`,
            [batchUserId, emails.map((e: string) => e.toLowerCase())]
          ).catch(() => {});
          await pool.query(
            `UPDATE output SET created_by = $1 WHERE LOWER(candidate_email) = ANY($2::text[]) AND (created_by IS NULL OR created_by = 'seeded-admin-user-id')`,
            [batchUserId, emails.map((e: string) => e.toLowerCase())]
          ).catch(() => {});
        }
      }
    }

    console.log(`[Webhook n8n batch-complete] Batch ${batchId} updated to ${status}.`);

    return NextResponse.json({
      success: true,
      message: `Batch ${batchId} finalized successfully.`,
      batch_id: batchId,
      status,
    });
  } catch (error: any) {
    console.error('Error handling n8n batch-complete webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
