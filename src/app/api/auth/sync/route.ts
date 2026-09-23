import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Deprecated: Custom JWT authentication is active.',
  });
}
