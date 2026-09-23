import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/database/db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'recruiter-assessment-platform-super-secret-key-123456789'
);

export interface TokenPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  [key: string]: any;
}

export async function signJWT(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return null;

    const payload = await verifyJWT(token);
    if (!payload) return null;

    // Get active user data from the database
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (user) return user;
    } catch (dbError) {
      console.warn('Database lookup failed in getCurrentUser, falling back to token payload:', dbError);
      return {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role as any,
      };
    }

    return null;
  } catch (error) {
    console.error('Error resolving current session user:', error);
    return null;
  }
}
