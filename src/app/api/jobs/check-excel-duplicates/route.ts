import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { pool } from '@/database/db';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to ensure the unique constraint exists on job_code
    try {
      await pool.query('ALTER TABLE job_descriptions ADD CONSTRAINT unique_job_code UNIQUE(job_code)');
    } catch (err: any) {
      // Ignore error if constraint already exists or if there are duplicate keys currently
    }

    const { positionIds, jds } = await request.json();

    const existingPositionIds = new Set<string>();
    const duplicateJdIndexes = new Set<number>();

    if (positionIds && positionIds.length > 0) {
      const posRes = await pool.query(
        'SELECT job_code FROM job_descriptions WHERE job_code = ANY($1::text[])',
        [positionIds]
      );
      posRes.rows.forEach((r: any) => {
        if (r.job_code) existingPositionIds.add(r.job_code.trim());
      });
    }

    if (jds && jds.length > 0) {
      const crypto = require('crypto');
      const hashToIndex = new Map<string, number[]>();
      
      const hashes = jds.map((jd: string, idx: number) => {
        const normalized = jd.trim().replace(/\s+/g, ' ').toLowerCase();
        const hash = crypto.createHash('md5').update(normalized).digest('hex');
        if (!hashToIndex.has(hash)) hashToIndex.set(hash, []);
        hashToIndex.get(hash)!.push(idx);
        return hash;
      });

      const hashRes = await pool.query(
        'SELECT content_hash FROM job_descriptions WHERE content_hash = ANY($1::text[])',
        [hashes]
      );
      hashRes.rows.forEach((r: any) => {
        if (r.content_hash && hashToIndex.has(r.content_hash)) {
          hashToIndex.get(r.content_hash)!.forEach(idx => duplicateJdIndexes.add(idx));
        }
      });
    }

    return NextResponse.json({
      existingPositionIds: Array.from(existingPositionIds),
      duplicateJdIndexes: Array.from(duplicateJdIndexes),
    });
  } catch (error: any) {
    console.error('Error checking excel duplicates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
