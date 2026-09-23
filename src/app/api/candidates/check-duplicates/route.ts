import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { candidates, emails } = body;

    let duplicates: any[] = [];

    if (candidates && Array.isArray(candidates)) {
      const conditions = candidates
        .filter((c: any) => c.email && c.jobId)
        .map((c: any) => ({
          email: c.email,
          positionId: BigInt(parseInt(c.jobId.toString(), 10)),
        }));

      if (conditions.length > 0) {
        duplicates = await prisma.candidate.findMany({
          where: {
            OR: conditions,
          },
          select: {
            email: true,
            positionId: true,
            fname: true,
            lname: true,
          },
        });
      }
    } else if (emails && Array.isArray(emails)) {
      duplicates = await prisma.candidate.findMany({
        where: {
          email: { in: emails.filter(Boolean) },
        },
        select: {
          email: true,
          positionId: true,
          fname: true,
          lname: true,
        },
      });
    }

    return NextResponse.json({ success: true, duplicates });
  } catch (error: any) {
    console.error('Error checking duplicate candidates:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
