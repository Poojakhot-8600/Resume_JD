import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      envJdWebhook: process.env.N8N_JD_WEBHOOK_URL || '',
      envCandidateWebhook:
        process.env.N8N_CANDIDATE_RESUME_WEBHOOK_URL ||
        process.env.N8N_CANDIDATE_IMPORT_URL ||
        '',
      envSharedSecret: process.env.N8N_SHARED_SECRET || '',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
