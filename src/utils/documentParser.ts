// Polyfill DOMMatrix if in Node environment lacking DOM globals
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {};
}

import mammoth from 'mammoth';

export interface ExtractedDocument {
  text: string;
  wordCount: number;
  charCount: number;
  fileName: string;
  fileType: string;
}

/**
 * Extracts plain text from various file formats (.pdf, .docx, .doc, .txt, .csv).
 */
export async function extractTextFromFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<ExtractedDocument> {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  let extractedText = '';

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs').catch(() => import('pdfjs-dist'));
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(fileBuffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      const doc = await loadingTask.promise;
      const pageTexts: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ');
        if (pageText.trim()) {
          pageTexts.push(pageText.trim());
        }
      }
      extractedText = pageTexts.join('\n\n').trim();
    } catch (pdfjsErr: any) {
      console.warn('pdfjs-dist extraction failed, trying pdf-parse fallback:', pdfjsErr?.message);
      try {
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
        const result = await parser.getText();
        extractedText = typeof result === 'string' ? result : (result?.text || '');
      } catch (pdfParseErr: any) {
        console.error('All PDF extraction libraries failed:', pdfParseErr?.message);
        throw new Error('PDF text extraction failed');
      }
    }

    // Strict validation against raw PDF binary bytes or structural markers
    if (
      !extractedText ||
      extractedText.trim().length === 0 ||
      extractedText.startsWith('%PDF-') ||
      /xref|endobj|%%EOF/.test(extractedText)
    ) {
      throw new Error('PDF text extraction failed');
    }
  } else if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    extractedText = result.value || '';
  } else if (ext === 'doc' || mimeType === 'application/msword') {
    // Try mammoth first (handles some modern doc formats) or clean readable ASCII/Unicode text
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      if (result.value && result.value.trim().length > 20) {
        extractedText = result.value;
      } else {
        throw new Error('Fallback to raw binary sweep');
      }
    } catch {
      // Clean string sweep for legacy .doc binary formats
      const raw = fileBuffer.toString('latin1');
      const printable = raw.replace(/[^\x20-\x7E\r\n\t]/g, ' ');
      extractedText = printable.replace(/\s{2,}/g, ' ').trim();
    }
  } else if (
    ext === 'xlsx' ||
    ext === 'xls' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    try {
      const XLSX = require('xlsx');
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      extractedText = extractExcelWorkbookText(workbook);
    } catch (excelErr: any) {
      console.error('Failed to parse Excel spreadsheet:', excelErr?.message);
      throw new Error(`Failed to parse Excel spreadsheet "${fileName}".`);
    }
  } else if (ext === 'csv' || mimeType === 'text/csv') {
    const raw = fileBuffer.toString('utf-8');
    try {
      const Papa = require('papaparse');
      const parsed = Papa.parse(raw, { header: true, skipEmptyLines: 'greedy' });
      if (parsed.data && parsed.data.length > 0 && Object.keys(parsed.data[0]).length > 1) {
        extractedText = parsed.data
          .map((row: any) =>
            Object.entries(row)
              .filter(([k, v]) => k && v !== undefined && v !== null && String(v).trim().length > 0)
              .map(([k, v]) => `${k.trim()}: ${String(v).trim()}`)
              .join(' | ')
          )
          .filter((line: string) => line.length > 0)
          .join('\n');
      } else {
        extractedText = raw;
      }
    } catch {
      extractedText = raw;
    }
  } else if (ext === 'txt' || ext === 'text' || mimeType?.startsWith('text/')) {
    extractedText = fileBuffer.toString('utf-8');
  } else {
    // Fallback: UTF-8 string
    extractedText = fileBuffer.toString('utf-8');
  }

  // Normalize line endings and extra whitespace
  extractedText = extractedText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const words = extractedText.length > 0 ? extractedText.split(/\s+/).filter(Boolean).length : 0;
  const chars = extractedText.length;

  return {
    text: extractedText,
    wordCount: words,
    charCount: chars,
    fileName,
    fileType: resolveFileType(fileName, mimeType),
  };
}

/**
 * Extracts clean, readable text from an Excel workbook (.xlsx, .xls).
 * Handles both tabular sheets with headers and freeform/document sheets.
 */
export function extractExcelWorkbookText(workbook: any): string {
  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    return '';
  }

  const XLSX = require('xlsx');
  const sheetTexts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;

    // Get 2D array of rows
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' }) as any[][];
    if (!rows || rows.length === 0) continue;

    // Determine if the sheet is a structured table:
    // Row 0 has >= 2 non-empty string headers that do not end with a colon
    const headerRow = rows[0] || [];
    const validHeaders = headerRow.filter(
      (h) => typeof h === 'string' && h.trim().length > 0 && !h.trim().endsWith(':')
    );
    const totalFilledHeaders = headerRow.filter((h) => String(h).trim().length > 0).length;
    const isLikelyTable = rows.length > 1 && validHeaders.length >= 2 && validHeaders.length === totalFilledHeaders;

    if (isLikelyTable) {
      const headers = headerRow.map((h) => String(h).trim());
      const dataRows = rows.slice(1);
      const formattedBlocks = dataRows
        .map((row) => {
          return headers
            .map((header, idx) => {
              const val = row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '';
              return header && val ? `${header}: ${val}` : '';
            })
            .filter(Boolean)
            .join('\n');
        })
        .filter((block) => block.trim().length > 0);

      if (formattedBlocks.length > 0) {
        sheetTexts.push(formattedBlocks.join('\n\n---\n\n'));
        continue;
      }
    }

    // Freeform or key-value spreadsheet
    const lines = rows
      .map((row) =>
        row
          .filter((cell) => cell !== null && cell !== undefined && String(cell).trim().length > 0)
          .map((cell) => String(cell).trim())
          .join(' ')
          .trim()
      )
      .filter((line) => line.length > 0);

    if (lines.length > 0) {
      sheetTexts.push(lines.join('\n'));
    }
  }

  return sheetTexts.join('\n\n').trim();
}

export const SUPPORTED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'csv', 'txt', 'text', 'xlsx', 'xls']);

export function isSupportedFormat(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return SUPPORTED_EXTENSIONS.has(ext);
}

export function resolveFileType(fileName: string, providedMime?: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === 'xls') return 'application/vnd.ms-excel';
  if (ext === 'csv') return 'text/csv';
  if (ext === 'txt' || ext === 'text') return 'text/plain';

  if (providedMime && providedMime !== 'application/octet-stream' && providedMime.trim().length > 0) {
    return providedMime;
  }
  return 'text/plain';
}
