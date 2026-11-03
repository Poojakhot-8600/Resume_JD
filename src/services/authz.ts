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
 * Returns Prisma filter for Jobs based on caller's role.
 * - ADMIN: unrestricted access across all recruiters
 * - RECRUITER: restricted to jobs created by the recruiter
 */
export function getJobScope(user: AuthenticatedUser): { createdBy?: string } {
  if (user.role === 'ADMIN') {
    return {};
  }
  return { createdBy: user.id };
}

/**
 * Returns Prisma filter for Candidates based on caller's role.
 * - ADMIN: unrestricted access
 * - RECRUITER: derived ownership via parent Job creator (job.createdBy === user.id)
 */
export function getCandidateScope(user: AuthenticatedUser): { job?: { createdBy: string } } {
  if (user.role === 'ADMIN') {
    return {};
  }
  return {
    job: {
      createdBy: user.id,
    },
  };
}

/**
 * Asserts that the authenticated user has authorization to access/modify a specific Job.
 * Prevents IDOR vulnerabilities.
 */
export async function assertJobOwnership(
  positionId: bigint | number | string,
  user: AuthenticatedUser
) {
  const finalId = typeof positionId === 'bigint' ? positionId : BigInt(positionId.toString());

  const job = await prisma.job.findUnique({
    where: { id: finalId },
  });

  if (!job) {
    throw new NotFoundError(`Job position ${positionId.toString()} not found.`);
  }

  if (user.role !== 'ADMIN' && job.createdBy !== user.id) {
    throw new AuthorizationError('Forbidden: You do not have permission to access or modify this job.');
  }

  return job;
}

/**
 * Asserts that the authenticated user has authorization to access/modify a specific Candidate.
 * Candidate ownership is strictly derived from the parent Job relationship.
 * Prevents IDOR vulnerabilities.
 */
export async function assertCandidateOwnership(
  candidateId: string,
  user: AuthenticatedUser
) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          createdBy: true,
        },
      },
    },
  });

  if (!candidate) {
    throw new NotFoundError(`Candidate ${candidateId} not found.`);
  }

  if (user.role !== 'ADMIN' && candidate.job.createdBy !== user.id) {
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
