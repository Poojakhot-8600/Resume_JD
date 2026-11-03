import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';
import { serializeBigInt } from '@/utils/serialize';
import { assertJobOwnership, AuthorizationError, NotFoundError } from '@/services/authz';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const positionId = BigInt(id);

    // Enforce multi-tenant access control (IDOR protection)
    await assertJobOwnership(positionId, user);

    const job = await prisma.job.findUnique({
      where: { id: positionId },
      include: {
        questions: {
          orderBy: { topic: 'asc' },
        },
        candidates: {
          include: {
            assessments: true,
          },
        },
        _count: {
          select: { candidates: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(serializeBigInt({ success: true, job }));
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching job details:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const positionId = BigInt(id);

    // Enforce multi-tenant access control (IDOR protection)
    await assertJobOwnership(positionId, user);

    await prisma.job.delete({
      where: { id: positionId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error deleting job:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const positionId = BigInt(id);

    // Enforce multi-tenant access control (IDOR protection)
    await assertJobOwnership(positionId, user);

    const body = await request.json();
    const { status, title, department, location, experience } = body;

    const updatedJob = await prisma.job.update({
      where: { id: positionId },
      data: {
        ...(status && { status }),
        ...(title && { title }),
        ...(department && { department }),
        ...(location && { location }),
        ...(experience && { experience }),
      },
    });

    return NextResponse.json(serializeBigInt({ success: true, job: updatedJob }));
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error updating job:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
