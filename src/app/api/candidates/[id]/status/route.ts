import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const inactiveAt = status === 'Inactive' ? new Date() : null;

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        status,
        inactiveAt,
      },
    });

    return NextResponse.json({ success: true, candidate });
  } catch (error: any) {
    console.error('Error updating candidate status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
