import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { pool } from '@/database/db';

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contentHash, status } = body;

    if (!contentHash || !status) {
      return NextResponse.json({ error: 'Missing contentHash or status' }, { status: 400 });
    }

    const inactiveAt = status === 'Inactive' ? new Date().toISOString() : null;

    const res = await pool.query(
      `UPDATE job_descriptions 
       SET status = $1, inactive_at = $2 
       WHERE content_hash = $3 
       RETURNING *`,
      [status, inactiveAt, contentHash]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Job description not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: any) {
    console.error('Error updating job description status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
