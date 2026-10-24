import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(_request: NextRequest) {
  // Bypassed: allow direct access to dashboard and all routes without middleware redirect
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
