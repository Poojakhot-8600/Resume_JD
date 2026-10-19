import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { extractTextFromFile, isSupportedFormat, resolveFileType, extractExcelWorkbookText } from '../src/utils/documentParser';

function assert(condition: unknown, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`✅ ${msg}`);
  }
}

async function runXlsxTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING EXCEL (.xlsx / .xls) JD SUPPORT TEST SUITE');
  console.log('====================================================\n');

  // Test 1: Supported Format Verification
  console.log('--- 1. Testing Format Detection & MIME Resolution ---');
  assert(isSupportedFormat('senior_backend_jd.xlsx'), 'isSupportedFormat recognizes .xlsx');
  assert(isSupportedFormat('SENIOR_DEV.XLSX'), 'isSupportedFormat is case-insensitive for .XLSX');
  assert(isSupportedFormat('legacy_job.xls'), 'isSupportedFormat recognizes .xls');
  assert(isSupportedFormat('some/path/to/job_description.xlsx'), 'isSupportedFormat handles full paths');
  assert(!isSupportedFormat('malicious_file.exe'), 'isSupportedFormat correctly rejects .exe');

  assert(
    resolveFileType('job.xlsx') === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'resolveFileType returns correct OpenXML spreadsheet MIME for .xlsx'
  );
  assert(
    resolveFileType('job.xls') === 'application/vnd.ms-excel',
    'resolveFileType returns correct Excel MIME for .xls'
  );

  // Test 2: Generate and Parse Tabular Excel (.xlsx) JD
  console.log('\n--- 2. Testing Tabular .xlsx Parsing ---');
  const tabularWb = XLSX.utils.book_new();
  const tabularData = [
    {
      'Position ID': 'POS-90210',
      'Job Title': 'Senior Full Stack Engineer',
      Department: 'Product Engineering',
      Location: 'Remote (US/Canada)',
      Experience: '5+ years',
      'Job Description': 'Lead architecture and develop high-throughput Next.js and Supabase features.',
      Requirements: 'Strong TypeScript, React, PostgreSQL, and background task processing.',
    },
    {
      'Position ID': 'POS-90211',
      'Job Title': 'AI Solutions Architect',
      Department: 'Applied AI',
      Location: 'San Francisco, CA',
      Experience: '7+ years',
      'Job Description': 'Design workflow automations with n8n, LLMs, and vector search systems.',
      Requirements: 'Experience with Python, LangChain, n8n webhooks, and scalable cloud infrastructure.',
    },
  ];
  const wsTabular = XLSX.utils.json_to_sheet(tabularData);
  XLSX.utils.book_append_sheet(tabularWb, wsTabular, 'Job Descriptions');

  const tabularBuffer = XLSX.write(tabularWb, { type: 'buffer', bookType: 'xlsx' });
  const tabularExtracted = await extractTextFromFile(tabularBuffer, 'open_roles.xlsx');

  assert(tabularExtracted.wordCount > 20, `Tabular text extracted successfully (${tabularExtracted.wordCount} words)`);
  assert(tabularExtracted.text.includes('Senior Full Stack Engineer'), 'Extracted text contains Senior Full Stack Engineer');
  assert(tabularExtracted.text.includes('Product Engineering'), 'Extracted text contains Product Engineering');
  assert(tabularExtracted.text.includes('AI Solutions Architect'), 'Extracted text contains AI Solutions Architect');
  assert(tabularExtracted.text.includes('POS-90210'), 'Extracted text contains Position ID POS-90210');
  assert(
    tabularExtracted.fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Extracted fileType is correct spreadsheet MIME'
  );

  // Test 3: Generate and Parse Freeform / Document-style Excel JD
  console.log('\n--- 3. Testing Freeform / Key-Value .xlsx Parsing ---');
  const freeformWb = XLSX.utils.book_new();
  const freeformData = [
    ['Job Title:', 'Lead DevOps & Infrastructure Engineer'],
    ['Department:', 'Platform & Cloud Operations'],
    ['Location:', 'New York, NY (Hybrid)'],
    ['Experience:', '6+ years in AWS/GCP and Kubernetes'],
    [],
    ['Role Overview:'],
    ['We are looking for an experienced Infrastructure Engineer to scale our cloud platform.'],
    [],
    ['Core Responsibilities:'],
    ['1. Maintain high availability Kubernetes clusters and CI/CD pipelines.'],
    ['2. Architect automated monitoring, logging, and disaster recovery.'],
    [],
    ['Technical Qualifications:'],
    ['- Terraform, Docker, Kubernetes, AWS EKS'],
    ['- Supabase, PostgreSQL replication and backup management'],
  ];
  const wsFreeform = XLSX.utils.aoa_to_sheet(freeformData);
  XLSX.utils.book_append_sheet(freeformWb, wsFreeform, 'DevOps JD');

  const freeformBuffer = XLSX.write(freeformWb, { type: 'buffer', bookType: 'xlsx' });
  const freeformExtracted = await extractTextFromFile(freeformBuffer, 'devops_jd.xlsx');

  assert(freeformExtracted.wordCount > 20, `Freeform text extracted successfully (${freeformExtracted.wordCount} words)`);
  assert(freeformExtracted.text.includes('Lead DevOps & Infrastructure Engineer'), 'Extracted text contains title');
  assert(freeformExtracted.text.includes('Platform & Cloud Operations'), 'Extracted text contains department');
  assert(freeformExtracted.text.includes('Kubernetes'), 'Extracted text contains Kubernetes');
  assert(freeformExtracted.text.includes('Terraform'), 'Extracted text contains Terraform');

  // Test 4: Multi-sheet Excel workbook
  console.log('\n--- 4. Testing Multi-Sheet Workbook Parsing ---');
  const multiWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(multiWb, wsTabular, 'Role 1');
  XLSX.utils.book_append_sheet(multiWb, wsFreeform, 'Role 2');

  const multiBuffer = XLSX.write(multiWb, { type: 'buffer', bookType: 'xlsx' });
  const multiExtracted = await extractTextFromFile(multiBuffer, 'all_company_jobs.xlsx');

  assert(multiExtracted.text.includes('Senior Full Stack Engineer'), 'Multi-sheet extracts from Sheet 1');
  assert(multiExtracted.text.includes('Lead DevOps & Infrastructure Engineer'), 'Multi-sheet extracts from Sheet 2');

  console.log('\n====================================================');
  console.log('🎉 ALL EXCEL (.xlsx / .xls) TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
}

runXlsxTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
