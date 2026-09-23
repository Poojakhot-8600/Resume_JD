import { NextResponse } from 'next/server';
import { prisma } from '@/database/db';
import { getCurrentUser } from '@/utils/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { id } = await params;

    if (id === currentUser.id) {
      return NextResponse.json({ error: 'Cannot delete your own active admin account.' }, { status: 400 });
    }

    // Check if user exists
    const userToDelete = await prisma.user.findUnique({
      where: { id },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    // Delete user account
    await prisma.user.delete({
      where: { id },
    });

    console.log(`[Admin Panel] User account deleted: ${userToDelete.email}`);

    return NextResponse.json({ success: true, message: 'HR/Recruiter account deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting team user:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
