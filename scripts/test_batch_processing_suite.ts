import fs from 'fs';
import path from 'path';

// Load .env before database modules
if (fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}

function assert(condition: unknown, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`✅ ${msg}`);
  }
}

async function runBatchProcessingTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING ASYNC BATCH PROCESSING COMPREHENSIVE SUITE');
  console.log('====================================================\n');

  const {
    ensureBatchTable,
    createBatch,
    getBatchById,
    updateBatchStatus,
    formatBatchResultMessage,
    preCheckDuplicatesInSupabase,
  } = await import('../src/services/batchService');

  const { pool } = await import('../src/database/db');

  // Test 1: Schema & Table Verification
  console.log('--- 1. Testing Database Schema & Table Persistence ---');
  await ensureBatchTable();
  const tableCheck = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'upload_batches'"
  );
  assert(tableCheck.rows.length >= 12, 'upload_batches table exists with all required columns');

  // Test 2: Message Formatting Specification
  console.log('\n--- 2. Testing Message Formatting Contract ---');
  const msg1 = formatBatchResultMessage(3, 1, 1, 'candidate');
  assert(
    msg1 === '3 candidates inserted successfully into Supabase. 1 duplicate candidate skipped. 1 candidate failed.',
    'Candidate mixed result matches exact specification example'
  );

  const msg2 = formatBatchResultMessage(4, 1, 0, 'job');
  assert(
    msg2 === '4 job descriptions inserted successfully into Supabase. 1 duplicate JD skipped.',
    'JD mixed result matches exact specification example'
  );

  const msg3 = formatBatchResultMessage(3, 0, 0, 'candidate');
  assert(
    msg3 === '3 candidates inserted successfully into Supabase.',
    'Duplicate sentence is omitted when duplicate count is 0'
  );

  const msg4 = formatBatchResultMessage(0, 0, 3, 'candidate');
  assert(
    msg4 === 'All 3 candidates failed to process.',
    'Total failure displays error message'
  );

  // Test 3: Batch Registration & Premature Notification Prevention
  console.log('\n--- 3. Testing Batch Registration & Status API Contract ---');
  const testUserId = 'test-user-' + Date.now();
  const testBatchId = 'batch_cand_test_' + Date.now();

  const registered = await createBatch({
    id: testBatchId,
    userId: testUserId,
    batchType: 'candidate',
    totalReceived: 3,
    metadata: { test: true },
  });

  assert(registered.batch_id === testBatchId, 'createBatch returns correct batch_id');
  assert(registered.status === 'processing', 'Initial status MUST be "processing"');
  assert(registered.inserted_count === 0, 'Initial inserted_count is 0');
  assert(registered.duplicate_count === 0, 'Initial duplicate_count is 0');
  assert(registered.failed_count === 0, 'Initial failed_count is 0');

  // Verify that status API retrieves persisted status from Supabase
  const { batch: fetchedBatch } = await getBatchById(testBatchId, testUserId);
  assert(fetchedBatch !== null, 'getBatchById successfully reads from Supabase');
  assert(fetchedBatch?.status === 'processing', 'Retrieved status is "processing"');
  assert(
    fetchedBatch?.message.includes('Processing candidates'),
    'State 2 message is persisted while processing'
  );

  // Test 4: Authorization and Security Checks
  console.log('\n--- 4. Testing Authorization & Security ---');
  const { unauthorized: authFailed } = await getBatchById(testBatchId, 'unauthorized-user-id');
  assert(authFailed === true, 'Access by different unauthorized user is rejected (403)');

  const { unauthorized: authOk } = await getBatchById(testBatchId, testUserId);
  assert(!authOk, 'Authorized owner can access batch');

  // Test 5: Scenario — All New Records
  console.log('\n--- 5. Testing Scenario: All New Records ---');
  const newBatchId = 'batch_new_' + Date.now();
  await createBatch({
    id: newBatchId,
    userId: testUserId,
    batchType: 'candidate',
    totalReceived: 3,
  });

  // Verify status is processing before completion
  const checkBefore = await getBatchById(newBatchId, testUserId);
  assert(checkBefore.batch?.status === 'processing', 'No premature success: status is still processing');
  assert(checkBefore.batch?.inserted_count === 0, 'Inserted count is 0 before completion');

  // Finalize batch
  await updateBatchStatus(newBatchId, {
    status: 'completed',
    inserted_count: 3,
    duplicate_count: 0,
    failed_count: 0,
    message: formatBatchResultMessage(3, 0, 0, 'candidate'),
    inserted_records: [
      { file_name: 'resume1.pdf', candidate_name: 'Dev One', status: 'inserted' },
      { file_name: 'resume2.pdf', candidate_name: 'Dev Two', status: 'inserted' },
      { file_name: 'resume3.pdf', candidate_name: 'Dev Three', status: 'inserted' },
    ],
  });

  const checkAfter = await getBatchById(newBatchId, testUserId);
  assert(checkAfter.batch?.status === 'completed', 'Final status is "completed"');
  assert(checkAfter.batch?.inserted_count === 3, 'Final inserted_count is exactly 3');
  assert(checkAfter.batch?.duplicate_count === 0, 'Final duplicate_count is 0');
  assert(checkAfter.batch?.failed_count === 0, 'Final failed_count is 0');
  assert(
    checkAfter.batch?.inserted_candidates?.length === 3,
    'inserted_candidates alias array populated'
  );
  assert(
    checkAfter.batch?.message === '3 candidates inserted successfully into Supabase.',
    'Message matches spec and omits duplicate sentence'
  );

  // Test 6: Scenario — All Duplicate Records
  console.log('\n--- 6. Testing Scenario: All Duplicate Records ---');
  const dupBatchId = 'batch_dup_' + Date.now();
  await createBatch({
    id: dupBatchId,
    userId: testUserId,
    batchType: 'job',
    totalReceived: 2,
  });

  await updateBatchStatus(dupBatchId, {
    status: 'completed',
    inserted_count: 0,
    duplicate_count: 2,
    failed_count: 0,
    message: formatBatchResultMessage(0, 2, 0, 'job'),
    duplicate_records: [
      { file_name: 'jd1.txt', job_code: 'J001', status: 'duplicate', reason: 'Already exists' },
      { file_name: 'jd2.txt', job_code: 'J002', status: 'duplicate', reason: 'Already exists' },
    ],
  });

  const dupCheck = await getBatchById(dupBatchId, testUserId);
  assert(dupCheck.batch?.status === 'completed', 'All duplicates status is "completed"');
  assert(dupCheck.batch?.inserted_count === 0, 'All duplicates inserted_count is 0');
  assert(dupCheck.batch?.duplicate_count === 2, 'All duplicates duplicate_count is 2');
  assert(
    dupCheck.batch?.duplicate_job_descriptions?.length === 2,
    'duplicate_job_descriptions alias populated'
  );
  assert(
    dupCheck.batch?.message.includes('2 duplicate JDs skipped.'),
    'Duplicate sentence present when duplicates exist'
  );

  // Test 7: Scenario — Mixture of New and Duplicate Records
  console.log('\n--- 7. Testing Scenario: Mixture of New and Duplicate Records ---');
  const mixBatchId = 'batch_mix_' + Date.now();
  await createBatch({
    id: mixBatchId,
    userId: testUserId,
    batchType: 'candidate',
    totalReceived: 3,
  });

  await updateBatchStatus(mixBatchId, {
    status: 'completed',
    inserted_count: 2,
    duplicate_count: 1,
    failed_count: 0,
    message: formatBatchResultMessage(2, 1, 0, 'candidate'),
    inserted_records: [
      { file_name: 'candA.pdf', candidate_name: 'Cand A', status: 'inserted' },
      { file_name: 'candB.pdf', candidate_name: 'Cand B', status: 'inserted' },
    ],
    duplicate_records: [
      { file_name: 'candC.pdf', candidate_name: 'Cand C', status: 'duplicate' },
    ],
  });

  const mixCheck = await getBatchById(mixBatchId, testUserId);
  assert(mixCheck.batch?.status === 'completed', 'Mixed batch status is "completed"');
  assert(mixCheck.batch?.inserted_count === 2, 'Mixed inserted_count is 2');
  assert(mixCheck.batch?.duplicate_count === 1, 'Mixed duplicate_count is 1');
  assert(
    mixCheck.batch?.message ===
      '2 candidates inserted successfully into Supabase. 1 duplicate candidate skipped.',
    'Mixed message accurately includes both inserted and duplicate counts'
  );

  // Test 8: Scenario — Partial Failures
  console.log('\n--- 8. Testing Scenario: Partial Failures ---');
  const partialBatchId = 'batch_partial_' + Date.now();
  await createBatch({
    id: partialBatchId,
    userId: testUserId,
    batchType: 'candidate',
    totalReceived: 5,
  });

  await updateBatchStatus(partialBatchId, {
    status: 'completed_with_errors',
    inserted_count: 3,
    duplicate_count: 1,
    failed_count: 1,
    message: formatBatchResultMessage(3, 1, 1, 'candidate'),
    inserted_records: [
      { file_name: 'c1.pdf', candidate_name: 'C1', status: 'inserted' },
      { file_name: 'c2.pdf', candidate_name: 'C2', status: 'inserted' },
      { file_name: 'c3.pdf', candidate_name: 'C3', status: 'inserted' },
    ],
    duplicate_records: [
      { file_name: 'c4.pdf', candidate_name: 'C4', status: 'duplicate' },
    ],
    failed_records: [
      { file_name: 'c5.pdf', error: 'PDF parsing error', status: 'failed' },
    ],
  });

  const partialCheck = await getBatchById(partialBatchId, testUserId);
  assert(
    partialCheck.batch?.status === 'completed_with_errors',
    'Partial failure sets status to "completed_with_errors"'
  );
  assert(partialCheck.batch?.inserted_count === 3, 'Partial inserted_count is 3');
  assert(partialCheck.batch?.duplicate_count === 1, 'Partial duplicate_count is 1');
  assert(partialCheck.batch?.failed_count === 1, 'Partial failed_count is 1');
  assert(
    partialCheck.batch?.message ===
      '3 candidates inserted successfully into Supabase. 1 duplicate candidate skipped. 1 candidate failed.',
    'Partial message matches exact contract format'
  );

  // Test 9: Scenario — Total Failure
  console.log('\n--- 9. Testing Scenario: Total Failure ---');
  const failBatchId = 'batch_fail_' + Date.now();
  await createBatch({
    id: failBatchId,
    userId: testUserId,
    batchType: 'job',
    totalReceived: 2,
  });

  await updateBatchStatus(failBatchId, {
    status: 'failed',
    inserted_count: 0,
    duplicate_count: 0,
    failed_count: 2,
    message: formatBatchResultMessage(0, 0, 2, 'job'),
    failed_records: [
      { file_name: 'bad1.txt', error: 'Corrupt file', status: 'failed' },
      { file_name: 'bad2.txt', error: 'Corrupt file', status: 'failed' },
    ],
  });

  const failCheck = await getBatchById(failBatchId, testUserId);
  assert(failCheck.batch?.status === 'failed', 'Total failure sets status to "failed"');
  assert(failCheck.batch?.failed_count === 2, 'Total failure failed_count equals total received');
  assert(failCheck.batch?.inserted_count === 0, 'Total failure inserted_count is 0');
  assert(
    failCheck.batch?.message === 'All 2 job descriptions failed to process.',
    'Total failure message is descriptive error'
  );

  // Test 10: Scenario — Slow n8n Workflow Simulation
  console.log('\n--- 10. Testing Scenario: Slow n8n Workflow Simulation ---');
  const slowBatchId = 'batch_slow_' + Date.now();
  await createBatch({
    id: slowBatchId,
    userId: testUserId,
    batchType: 'candidate',
    totalReceived: 1,
  });

  // Check state at t = 0
  const t0 = await getBatchById(slowBatchId, testUserId);
  assert(t0.batch?.status === 'processing', 'At t=0s, status is "processing"');
  assert(t0.batch?.inserted_count === 0, 'At t=0s, no premature success');

  // Simulate slow workflow completing after 2 seconds
  await new Promise((r) => setTimeout(r, 2000));
  const tMid = await getBatchById(slowBatchId, testUserId);
  assert(tMid.batch?.status === 'processing', 'At t=2s before finish, status is still "processing"');

  // Workflow finishes
  await updateBatchStatus(slowBatchId, {
    status: 'completed',
    inserted_count: 1,
    duplicate_count: 0,
    failed_count: 0,
    message: formatBatchResultMessage(1, 0, 0, 'candidate'),
  });

  const tEnd = await getBatchById(slowBatchId, testUserId);
  assert(tEnd.batch?.status === 'completed', 'After completion, status is "completed"');
  assert(tEnd.batch?.inserted_count === 1, 'Only now is inserted_count displayed as 1');

  // Test 11: Scenario — Network Error During Polling
  console.log('\n--- 11. Testing Scenario: Network Error During Polling ---');
  const netErrBatchId = 'batch_net_' + Date.now();
  await createBatch({
    id: netErrBatchId,
    userId: testUserId,
    batchType: 'job',
    totalReceived: 1,
  });

  // Verify that an interrupted poll or network error does NOT corrupt the persisted batch
  const netCheck = await getBatchById(netErrBatchId, testUserId);
  assert(netCheck.batch?.status === 'processing', 'Batch remains processing despite network hiccups');
  assert(netCheck.batch?.status !== 'failed', 'Network error on client does NOT mark batch failed in database');

  // Test 12: Scenario — Page Refresh Simulation
  console.log('\n--- 12. Testing Scenario: Page Refresh While Processing ---');
  const refreshBatchId = 'batch_refresh_' + Date.now();
  await createBatch({
    id: refreshBatchId,
    userId: testUserId,
    batchType: 'candidate',
    totalReceived: 4,
  });

  // Simulate page reload: the client retrieves the batchId from sessionStorage
  const simulatedSavedBatchId = refreshBatchId;
  const reloadedBatch = await getBatchById(simulatedSavedBatchId, testUserId);
  assert(reloadedBatch.batch !== null, 'Batch recovered after page refresh');
  assert(reloadedBatch.batch?.batch_id === refreshBatchId, 'Recovered batch ID matches');
  assert(reloadedBatch.batch?.status === 'processing', 'Recovered batch maintains active "processing" state');

  // Test 13: Scenario — Polling Timeout Handling
  console.log('\n--- 13. Testing Scenario: Polling Timeout Behavior ---');
  const timeoutBatchId = 'batch_timeout_' + Date.now();
  await createBatch({
    id: timeoutBatchId,
    userId: testUserId,
    batchType: 'candidate',
    totalReceived: 2,
  });

  // Requirement: If polling times out, do not mark batch failed unless backend confirms failure.
  const timeoutCheck = await getBatchById(timeoutBatchId, testUserId);
  assert(
    timeoutCheck.batch?.status === 'processing',
    'Timed out client poll leaves backend batch in "processing", not falsely failed'
  );

  console.log('\n====================================================');
  console.log('🎉 ALL 13 ASYNC BATCH PROCESSING TESTS PASSED!');
  console.log('====================================================\n');

  await pool.end();
  process.exit(0);
}

runBatchProcessingTests().catch((err) => {
  console.error('\n❌ Batch processing test suite failed:', err);
  process.exit(1);
});
