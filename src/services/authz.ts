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
 * - ADMIN: By default has full visibility into all jobs (including recruiter uploads like Sakshi's).
 * - RECRUITER: Strictly isolated to their own uploaded jobs (createdBy: user.id).
 * - onlyMine: When explicitly true, limits even an ADMIN to their own jobs.
 */
export function getJobScope(
  user: AuthenticatedUser,
  options?: { allForAdmin?: boolean; onlyMine?: boolean }
): { createdBy?: string } {
  if (user.role === 'ADMIN' && !options?.onlyMine) {
    return {};
  }
  return { createdBy: user.id };
}

/**
 * Returns Prisma filter for Candidates based on caller's role and requested scope.
 * - ADMIN: By default has full visibility into all candidates across the organization.
 * - RECRUITER: Strictly isolated to candidates they created or attached to their jobs.
 * - onlyMine: When explicitly true, limits even an ADMIN to their own candidates.
 */
export function getCandidateScope(
  user: AuthenticatedUser,
  options?: { allForAdmin?: boolean; onlyMine?: boolean }
) {
  if (user.role === 'ADMIN' && !options?.onlyMine) {
    return {};
  }
  return {
    OR: [
      { createdBy: user.id },
      { job: { createdBy: user.id } },
    ],
  };
}

/**
 * Asserts that the authenticated user has authorization to access/modify a specific Job.
 * - ADMIN: Has administrative access to all jobs.
 * - RECRUITER: Strictly isolated to jobs they created.
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

  const isOwner = user.role === 'ADMIN' || job.createdBy === user.id;
  if (!isOwner) {
    throw new AuthorizationError('Forbidden: You do not have permission to access or modify this job.');
  }

  return job;
}

/**
 * Asserts that the authenticated user has authorization to access/modify a specific Candidate.
 * - ADMIN: Has administrative access to all candidates.
 * - RECRUITER: Strictly isolated to candidates they created or candidates in their jobs.
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
          jdRawText: true,
          title: true,
          createdBy: true,
        },
      },
    },
  });

  if (!candidate) {
    throw new NotFoundError(`Candidate ${candidateId} not found.`);
  }

  const isOwner =
    user.role === 'ADMIN' ||
    candidate.createdBy === user.id ||
    candidate.job?.createdBy === user.id;

  if (!isOwner) {
    throw new AuthorizationError('Forbidden: You do not have permission to access or modify this candidate.');
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
