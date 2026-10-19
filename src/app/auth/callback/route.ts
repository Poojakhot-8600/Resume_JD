import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as any;
  const next = requestUrl.searchParams.get('next') || '/reset-password';
  const origin = requestUrl.origin;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('Supabase code exchange error:', error);
    return NextResponse.redirect(
      `${origin}/reset-password?error=${encodeURIComponent(error.message || 'invalid_or_expired_link')}`
    );
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('Supabase verifyOtp error:', error);
    return NextResponse.redirect(
      `${origin}/reset-password?error=${encodeURIComponent(error.message || 'invalid_or_expired_link')}`
    );
  }

  // If already at reset-password or no code provided
  return NextResponse.redirect(`${origin}/reset-password`);
}
