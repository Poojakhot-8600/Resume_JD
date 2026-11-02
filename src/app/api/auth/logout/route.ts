import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'auth_token',
      value: '',
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });
    cookieStore.set({
      name: 'refresh_token',
      value: '',
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set({ name: 'auth_token', value: '', maxAge: 0, path: '/' });
    response.cookies.set({ name: 'refresh_token', value: '', maxAge: 0, path: '/' });
    return response;
  } catch (error: any) {
    console.error('Custom Logout API error:', error);
    return NextResponse.json(
      { error: 'An unexpected logout error occurred.' },
      { status: 500 }
    );
  }
}
