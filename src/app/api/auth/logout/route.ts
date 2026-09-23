import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Custom Logout API error:', error);
    return NextResponse.json(
      { error: 'An unexpected logout error occurred.' },
      { status: 500 }
    );
  }
}
