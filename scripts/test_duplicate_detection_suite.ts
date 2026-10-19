import fs from 'fs';
import path from 'path';

// Load .env before any database modules are imported
if (fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`✅ ${msg}`);
  }
}

async function runTests() {
  const { 
    normalizeN8nUploadResponse, 
    checkJdDuplicatesInSupabase, 
    checkCandidateDuplicatesInSupabase 
  } = await import('../src/utils/duplicateDetection');

  console.log('\n--- 1. Testing normalizeN8nUploadResponse ---');

  // Test 1.1: Standard contract payload
  const standardN8n = {
    success: true,
    message: '3 job descriptions inserted successfully; 2 duplicates skipped.',
    total_received: 5,
    inserted_count: 3,
    duplicate_count: 2,
    failed_count: 0,
    inserted_records: [{ file_name: 'jd1.pdf', job_code: 'J001' }],
    duplicate_records: [{ file_name: 'jd2.pdf', job_code: 'J002', reason: 'Already exists' }],
    failed_records: []
  };
  const norm1 = normalizeN8nUploadResponse(standardN8n, 200, [{ file_name: 'dummy', text: 'text' }], 'job');
  assert(norm1 !== null, 'Standard n8n contract should be parsed');
  assert(norm1?.inserted_count === 3, 'inserted_count should be 3');
  assert(norm1?.duplicate_count === 2, 'duplicate_count should be 2');
  assert(norm1?.failed_count === 0, 'failed_count should be 0');
  assert(norm1?.success === true, 'success should be true');

  // Test 1.2: Array of item results
  const arrayN8n = [
    { file_name: 'resume1.pdf', status: 'inserted' },
    { file_name: 'resume2.pdf', status: 'duplicate', reason: 'Email exists' },
    { file_name: 'resume3.pdf', status: 'failed', error: 'Extraction failed' },
  ];
  const norm2 = normalizeN8nUploadResponse(arrayN8n, 200, [{ file_name: 'a', text: 'a' }], 'candidate');
  assert(norm2 !== null, 'Array n8n response should be parsed');
  assert(norm2?.inserted_count === 1, 'Array inserted_count should be 1');
  assert(norm2?.duplicate_count === 1, 'Array duplicate_count should be 1');
  assert(norm2?.failed_count === 1, 'Array failed_count should be 1');
  assert(norm2?.total_received === 3, 'Array total_received should be 3');

  // Test 1.3: Nested data wrapper
  const nestedN8n = {
    data: {
      inserted_count: 4,
      duplicate_count: 1,
      failed_count: 0,
    }
  };
  const norm3 = normalizeN8nUploadResponse(nestedN8n, 200, [{ file_name: 'a', text: 'a' }], 'job');
  assert(norm3 !== null, 'Nested data n8n response should be parsed');
  assert(norm3?.inserted_count === 4, 'Nested inserted_count should be 4');
  assert(norm3?.duplicate_count === 1, 'Nested duplicate_count should be 1');

  // Test 1.4: Error response from n8n
  const errorN8n = { code: 0, message: 'There was a problem executing the workflow' };
  const norm4 = normalizeN8nUploadResponse(errorN8n, 500, [{ file_name: 'test.pdf', text: 'hello' }], 'job');
  assert(norm4 !== null, 'Error response should be normalized');
  assert(norm4?.success === false, 'Error response success should be false');
  assert(norm4?.failed_count === 1, 'Error response failed_count should match submitted items');
  assert(norm4?.inserted_count === 0, 'Error response inserted_count should be 0');

  // Test 1.5: Async webhook acknowledgment without counts (should return null so caller falls back to Supabase check)
  const asyncAckN8n = { message: 'Workflow was started' };
  const norm5 = normalizeN8nUploadResponse(asyncAckN8n, 200, [{ file_name: 'test.pdf', text: 'hello' }], 'job');
  assert(norm5 === null, 'Async acknowledgment without count fields should return null for Supabase fallback');


  console.log('\n--- 2. Testing checkJdDuplicatesInSupabase ---');
  // Test 2.1: Intra-batch duplicate check
  const duplicateBatchJDs = [
    { file_name: 'unique_jd_batch_a.txt', text: 'Senior React Developer with Redux expertise needed.' },
    { file_name: 'duplicate_copy_batch_a.txt', text: 'Senior React Developer with Redux expertise needed.' }
  ];
  const jdRes1 = await checkJdDuplicatesInSupabase(duplicateBatchJDs);
  assert(jdRes1.total_received === 2, 'Total received should be 2');
  assert(jdRes1.duplicate_count >= 1, 'Intra-batch duplicate should be caught');
  assert(jdRes1.duplicate_records.some(r => r.file_name === 'duplicate_copy_batch_a.txt'), 'Duplicate copy was recorded in duplicate_records');

  // Test 2.2: Existing JD in database check (J001 or existing hash)
  const existingJDs = [
    { file_name: 'existing_jd_test.txt', text: 'Job Code: J001\nFull Stack Engineer responsible for database systems.' }
  ];
  const jdRes2 = await checkJdDuplicatesInSupabase(existingJDs);
  console.log('JD existing check result:', {
    inserted: jdRes2.inserted_count,
    duplicate: jdRes2.duplicate_count,
    duplicate_records: jdRes2.duplicate_records.map(r => ({ name: r.file_name, reason: r.reason }))
  });
  assert(jdRes2.total_received === 1, 'Total received is 1');
  assert(jdRes2.duplicate_count === 1, 'Known JD with code J001 should be detected as duplicate');


  console.log('\n--- 3. Testing checkCandidateDuplicatesInSupabase ---');
  // Test 3.1: Intra-batch duplicate email check
  const duplicateBatchCandidates = [
    { file_name: 'candidate1.txt', text: 'John Doe\nEmail: alex.test.duplicate@example.com\nExperienced Java developer' },
    { file_name: 'candidate2_copy.txt', text: 'Johnathan Doe\nEmail: alex.test.duplicate@example.com\nSame candidate updated' }
  ];
  const candRes1 = await checkCandidateDuplicatesInSupabase(duplicateBatchCandidates);
  assert(candRes1.total_received === 2, 'Candidate total received should be 2');
  assert(candRes1.duplicate_count >= 1, 'Duplicate candidate email in same batch should be skipped');
  assert(candRes1.duplicate_records.some(r => r.candidate_email === 'alex.test.duplicate@example.com'), 'Duplicate candidate email recorded');

  // Test 3.2: Brand new candidate check with random email
  const randomEmail = `new.dev.${Date.now()}@example.org`;
  const newCandidate = [
    { file_name: 'brand_new_dev.txt', text: `Alice Wonder\nEmail: ${randomEmail}\nSenior Rust Engineer with distributed systems background.` }
  ];
  const candRes2 = await checkCandidateDuplicatesInSupabase(newCandidate);
  assert(candRes2.total_received === 1, 'Total received is 1');
  assert(candRes2.inserted_count === 1, 'Brand new candidate should be marked as inserted');
  assert(candRes2.duplicate_count === 0, 'No duplicates should be detected for brand new candidate');
  assert(candRes2.inserted_records[0].candidate_email === randomEmail, 'Extracted candidate email matches');

  // Test 3.3: Mixture of new and duplicate in same batch
  const mixedCandidates = [
    { file_name: 'brand_new_cand.txt', text: `Bob Unique\nEmail: bob.unique.${Date.now()}@example.org\nKubernetes and Go engineer.` },
    { file_name: 'duplicate_same_batch.txt', text: `Bob Duplicate\nEmail: bob.unique.${Date.now()}@example.org\nSame email duplicate.` }
  ];
  const candRes3 = await checkCandidateDuplicatesInSupabase(mixedCandidates);
  assert(candRes3.total_received === 2, 'Mixed total received is 2');
  assert(candRes3.inserted_count === 1, 'Mixed should have 1 inserted');
  assert(candRes3.duplicate_count === 1, 'Mixed should have 1 duplicate');
  assert(candRes3.message.includes('1 candidate resume inserted successfully; 1 duplicate candidate resume skipped.'), 'Message format matches spec');

  console.log('\n🎉 ALL DUPLICATE DETECTION TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
