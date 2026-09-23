import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { prisma } from '@/database/db';
import { serializeBigInt } from '@/utils/serialize';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { positionIds, titles } = await req.json();

    const parsedPositionIds = (positionIds || [])
      .map((id: any) => {
        try {
          return BigInt(parseInt(id?.toString(), 10));
        } catch (_) {
          return null;
        }
      })
      .filter((id: any): id is bigint => id !== null && !isNaN(Number(id)));

    const duplicates = await prisma.job.findMany({
      where: {
        OR: [
          { id: { in: parsedPositionIds } },
          { title: { in: titles?.filter(Boolean) || [] } },
        ],
      },
      select: {
        id: true,
        title: true,
      },
    });

    return NextResponse.json(serializeBigInt({ success: true, duplicates }));
  } catch (error: any) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
