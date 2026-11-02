import 'dotenv/config';
import '../src/utils/dns-fix';
import { prisma } from '../src/database/db';
import { signJWT, verifyJWT, getCurrentUser } from '../src/utils/auth';
import {
  getJobScope,
  getCandidateScope,
  assertJobOwnership,
  assertCandidateOwnership,
  verifyTimingSafeSecret,
  AuthorizationError,
  NotFoundError,
} from '../src/services/authz';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`✅ ${msg}`);
  }
}

async function runSecurityTests() {
  console.log('\n======================================================');
  console.log('🔒 RUNNING SECURITY, MULTI-TENANCY & IDOR AUDIT SUITE');
  console.log('======================================================');

  // --- 1. Test JWT Verification & Anti-Forgery ---
  console.log('\n--- 1. Testing JWT Cryptographic Verification & Tamper Protection ---');

  const adminToken = await signJWT({
    id: 'seeded-admin-user-id',
    name: 'Super Admin',
    email: 'admin@gmail.com',
    role: 'ADMIN',
  });
  assert(typeof adminToken === 'string' && adminToken.length > 20, 'Signed valid admin JWT');

  const recruiterToken = await signJWT({
    id: 'seeded-recruiter-user-id',
    name: 'Lead Recruiter',
    email: 'recruiter@gmail.com',
    role: 'RECRUITER',
  });
  assert(typeof recruiterToken === 'string' && recruiterToken.length > 20, 'Signed valid recruiter JWT');

  // Verify valid tokens
  const verifiedAdmin = await verifyJWT(adminToken);
  assert(verifiedAdmin?.role === 'ADMIN' && verifiedAdmin?.id === 'seeded-admin-user-id', 'Valid Admin token decoded correctly');

  const verifiedRecruiter = await verifyJWT(recruiterToken);
  assert(verifiedRecruiter?.role === 'RECRUITER' && verifiedRecruiter?.id === 'seeded-recruiter-user-id', 'Valid Recruiter token decoded correctly');

  // Test Forged / Tampered Token
  const parts = adminToken.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ id: 'seeded-admin-user-id', role: 'ADMIN', email: 'admin@gmail.com', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const forgedToken = `${parts[0]}.${forgedPayload}.invalidsignature1234567890`;

  const forgedResult = await verifyJWT(forgedToken);
  assert(forgedResult === null, 'Forged JWT with bad signature MUST be rejected (returns null)');

  // Test Empty / Garbage Token
  assert((await verifyJWT('')) === null, 'Empty token returns null');
  assert((await verifyJWT('invalid.string')) === null, 'Malformed token returns null');

  // --- 2. Test Unauthenticated getCurrentUser() Fallback Removal ---
  console.log('\n--- 2. Testing Unauthenticated Request Handling ---');

  const unauthenticatedUser = await getCurrentUser();
  assert(unauthenticatedUser === null, 'Unauthenticated request must return null (NO automatic escalation to Admin)');

  const authHeaderReq = new Request('http://localhost:3000/api/jobs', {
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  const resolvedRecruiter = await getCurrentUser(authHeaderReq);
  assert(resolvedRecruiter?.id === 'seeded-recruiter-user-id', 'Bearer header resolves to correct recruiter');
  assert(resolvedRecruiter?.role === 'RECRUITER', 'Role resolved as RECRUITER');

  // --- 3. Test Multi-Tenant Job Scoping ---
  console.log('\n--- 3. Testing Multi-Tenant Job Isolation ---');

  const adminScope = getJobScope(verifiedAdmin!);
  assert(Object.keys(adminScope).length === 0, 'Admin job scope has no filters (can view all jobs)');

  const recruiterScope = getJobScope(verifiedRecruiter!);
  assert(recruiterScope.createdBy === 'seeded-recruiter-user-id', 'Recruiter job scope filters by createdBy = recruiter.id');

  // Query jobs from DB as Admin
  const adminJobs = await prisma.job.findMany({ where: adminScope });
  assert(adminJobs.length === 5, `Super Admin can access all 5 jobs (found ${adminJobs.length})`);

  // Query jobs from DB as Recruiter
  const recruiterJobs = await prisma.job.findMany({ where: recruiterScope });
  assert(recruiterJobs.length === 2, `Recruiter can ONLY access their 2 owned jobs (found ${recruiterJobs.length})`);
  assert(recruiterJobs.every((j) => j.createdBy === 'seeded-recruiter-user-id'), 'All retrieved jobs belong to recruiter');

  // --- 4. Test IDOR Protection on Jobs ---
  console.log('\n--- 4. Testing IDOR Protection on Job Operations ---');

  // Admin access to any job succeeds
  const job1Id = BigInt('1100112'); // Admin's job
  const job4Id = BigInt('1100128'); // Recruiter's job

  const adminAccessJob1 = await assertJobOwnership(job1Id, verifiedAdmin!);
  assert(adminAccessJob1.id === job1Id, 'Admin successfully accessed Admin job');

  const adminAccessJob4 = await assertJobOwnership(job4Id, verifiedAdmin!);
  assert(adminAccessJob4.id === job4Id, 'Admin successfully accessed Recruiter job');

  // Recruiter access to own job succeeds
  const recruiterAccessOwn = await assertJobOwnership(job4Id, verifiedRecruiter!);
  assert(recruiterAccessOwn.id === job4Id, 'Recruiter successfully accessed their own job');

  // Recruiter access to Admin's job MUST fail with 403 Forbidden
  let idorBlocked = false;
  try {
    await assertJobOwnership(job1Id, verifiedRecruiter!);
  } catch (err: any) {
    if (err instanceof AuthorizationError && err.statusCode === 403) {
      idorBlocked = true;
    }
  }
  assert(idorBlocked, 'IDOR Attempt BLOCKED: Recruiter cannot access or modify job owned by Admin (403 Forbidden)');

  // --- 5. Test Candidate Ownership Derived from Job Relationship ---
  console.log('\n--- 5. Testing Candidate Ownership Derived from Job Relationship ---');

  const adminCandidateScope = getCandidateScope(verifiedAdmin!);
  assert(Object.keys(adminCandidateScope).length === 0, 'Admin candidate scope has no filters');

  const recruiterCandidateScope = getCandidateScope(verifiedRecruiter!);
  assert(recruiterCandidateScope.job?.createdBy === 'seeded-recruiter-user-id', 'Recruiter candidate scope derives ownership via job.createdBy');

  // Query candidates from DB as Admin
  const allCandidates = await prisma.candidate.findMany({ where: adminCandidateScope });
  assert(allCandidates.length === 7, `Super Admin sees all 7 candidates across company (found ${allCandidates.length})`);

  // Query candidates from DB as Recruiter
  const myCandidates = await prisma.candidate.findMany({ where: recruiterCandidateScope, include: { job: true } });
  assert(myCandidates.length === 2, `Recruiter ONLY sees candidates matched to their jobs (found ${myCandidates.length})`);
  assert(myCandidates.every((c) => c.job.createdBy === 'seeded-recruiter-user-id'), 'Every candidate belongs to recruiter parent job');

  // --- 6. Test IDOR Protection on Candidates ---
  console.log('\n--- 6. Testing IDOR Protection on Candidate Operations ---');

  const adminCandidate = allCandidates.find((c) => c.fname === 'Alice')!;
  const recruiterCandidate = allCandidates.find((c) => c.fname === 'David')!;

  // Recruiter access to own candidate succeeds
  const ownCandAccess = await assertCandidateOwnership(recruiterCandidate.id, verifiedRecruiter!);
  assert(ownCandAccess.id === recruiterCandidate.id, 'Recruiter successfully accessed their candidate');

  // Recruiter attempting to access/modify Admin candidate MUST fail with 403
  let candIdorBlocked = false;
  try {
    await assertCandidateOwnership(adminCandidate.id, verifiedRecruiter!);
  } catch (err: any) {
    if (err instanceof AuthorizationError && err.statusCode === 403) {
      candIdorBlocked = true;
    }
  }
  assert(candIdorBlocked, 'IDOR Attempt BLOCKED: Recruiter cannot access/shortlist candidate belonging to another recruiter');

  // --- 7. Test Timing-Safe Secret Verification ---
  console.log('\n--- 7. Testing Timing-Safe Webhook Secret Verification ---');

  const correctSecret = process.env.N8N_SHARED_SECRET || 'n8n_prod_shared_secret_7384910284759302';
  assert(verifyTimingSafeSecret(correctSecret, correctSecret) === true, 'Exact secret matches');
  assert(verifyTimingSafeSecret('wrong-secret-123', correctSecret) === false, 'Wrong secret fails');
  assert(verifyTimingSafeSecret('', correctSecret) === false, 'Empty secret fails');
  assert(verifyTimingSafeSecret(null, correctSecret) === false, 'Null secret fails');

  console.log('\n======================================================');
  console.log('🎉 ALL SECURITY, MULTI-TENANCY & IDOR TESTS PASSED!');
  console.log('======================================================\n');
}

runSecurityTests()
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
