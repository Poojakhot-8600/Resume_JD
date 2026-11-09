import crypto from 'crypto';
import { prisma } from '@/database/db';
import { AuthenticatedUser } from '@/utils/auth';

export class AuthorizationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends Error {
  statusCode: number;
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

/**
 * Returns Prisma filter for Jobs based on caller's role and requested scope.
 * - By default: strictly isolated to the authenticated user's own jobs (createdBy: user.id).
 * - allForAdmin (optional): if caller is ADMIN and explicitly requests team view, returns unrestricted scope.
 */
export function getJobScope(
  user: AuthenticatedUser,
  options?: { allForAdmin?: boolean }
): { createdBy?: string } {
  if (options?.allForAdmin && user.role === 'ADMIN') {
    return {};
  }
  return { createdBy: user.id };
}

/**
 * Returns Prisma filter for Candidates based on caller's role and requested scope.
 * - By default: strictly isolated to the authenticated user's candidates (job.createdBy === user.id).
 * - allForAdmin (optional): if caller is ADMIN and explicitly requests team view, returns unrestricted scope.
 */
export function getCandidateScope(
  user: AuthenticatedUser,
  options?: { allForAdmin?: boolean }
) {
  if (options?.allForAdmin && user.role === 'ADMIN') {
    return {};
  }
  return {
    job: { createdBy: user.id },
  };
}

/**
 * Asserts that the authenticated user has authorization to access/modify a specific Job.
 * Enforces strict tenant and user-level isolation (prevents IDOR vulnerabilities).
 */
export async function assertJobOwnership(
  positionId: bigint | number | string,
  user: AuthenticatedUser,
  options?: { allowAdminOverride?: boolean }
) {
  const finalId = typeof positionId === 'bigint' ? positionId : BigInt(positionId.toString());

  const job = await prisma.job.findUnique({
    where: { id: finalId },
  });

  if (!job) {
    throw new NotFoundError(`Job position ${positionId.toString()} not found.`);
  }

  const isOwner = job.createdBy === user.id || (Boolean(options?.allowAdminOverride) && user.role === 'ADMIN');
  if (!isOwner) {
    throw new AuthorizationError('Forbidden: You do not have permission to access or modify this job.');
  }

  return job;
}

/**
 * Asserts that the authenticated user has authorization to access/modify a specific Candidate.
 * Enforces strict user isolation: caller must own the parent job.
 * Prevents IDOR vulnerabilities.
 */
export async function assertCandidateOwnership(
  candidateId: string,
  user: AuthenticatedUser,
  options?: { allowAdminOverride?: boolean }
) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      job: {
        select: {
          id: true,
          jobCode: true,
          title: true,
          createdBy: true,
        },
      },
    },
  });

  if (!candidate) {
    throw new NotFoundError(`Candidate ${candidateId} not found.`);
  }

  // ADMIN can always access; RECRUITER must own the linked job
  if (user.role !== 'ADMIN') {
    if (!candidate.job || candidate.job.createdBy !== user.id) {
      throw new AuthorizationError('Forbidden: You do not have permission to access or modify this candidate.');
    }
  }

  return candidate;
}

/**
 * Timing-safe string comparison to protect webhook secrets against side-channel timing attacks.
 */
export function verifyTimingSafeSecret(provided: string | null | undefined, expected: string): boolean {
  if (!provided || typeof provided !== 'string') return false;
  if (!expected || typeof expected !== 'string') return false;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}
