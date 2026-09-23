/**
 * Frontend PDF and Document Text Extractor
 * Extracts real readable text from PDF pages.
 * Never decodes raw PDF bytes with TextDecoder or returns PDF binary markers.
 */

/**
 * Validate that text is real extracted text and not raw PDF binary / structure.
 */
export function validateExtractedPdfText(text: string): boolean {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return false;
  }
  const trimmed = text.trim();
  if (trimmed.startsWith('%PDF-') || trimmed.includes('%PDF-')) {
    return false;
  }
  // Check for PDF structural content
  if (/\b(?:xref\s+\d+|endobj|%%EOF)\b/.test(trimmed) || /stream[\r\n]/.test(trimmed)) {
    return false;
  }
  return true;
}

/**
 * Extract readable text from all pages of a PDF File in the browser.
 * Uses client-side pdfjs-dist when possible, with seamless fallback to /api/jobs/parse-document.
 */
export async function extractPdfTextInBrowser(file: File): Promise<string> {
  // First attempt: client-side pdfjs-dist extraction
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await import('pdfjs-dist');

    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      isEvalSupported: true,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();

      let lastY: number | null = null;
      let pageText = '';

      for (const item of content.items) {
        if ('str' in item && typeof item.str === 'string') {
          const str = item.str;
          const currentY = Array.isArray(item.transform) ? item.transform[5] : null;

          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
            pageText += '\n' + str;
          } else {
            if (
              pageText.length > 0 &&
              !pageText.endsWith(' ') &&
              !pageText.endsWith('\n') &&
              !str.startsWith(' ')
            ) {
              pageText += ' ';
            }
            pageText += str;
          }
          if (currentY !== null) {
            lastY = currentY;
          }
        }
      }

      const trimmedPage = pageText.trim();
      if (trimmedPage.length > 0) {
        pageTexts.push(trimmedPage);
      }
    }

    const fullText = pageTexts.join('\n\n').trim();

    if (validateExtractedPdfText(fullText)) {
      return fullText;
    }
  } catch (clientErr) {
    console.warn('Client-side pdfjs extraction encountered an issue, using parser API endpoint:', clientErr);
  }

  // Second attempt: parse-document endpoint (which runs server-side pdfjs parser cleanly)
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/jobs/parse-document', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!res.ok || !data.success || !data.text) {
      throw new Error(data.error || 'PDF text extraction failed');
    }

    const serverExtractedText = (data.text as string).trim();

    if (!validateExtractedPdfText(serverExtractedText)) {
      throw new Error('PDF text extraction failed');
    }

    return serverExtractedText;
  } catch (serverErr: any) {
    console.error('All PDF extraction attempts failed:', serverErr);
    throw new Error('PDF text extraction failed');
  }
}

/**
 * Extract text from a frontend file based on its extension / MIME type.
 * Supports PDF (.pdf), Word (.docx, .doc), CSV (.csv), and Text (.txt).
 */
export async function extractTextFromClientFile(file: File): Promise<{
  text: string;
  fileName: string;
  fileType: string;
}> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  let fileType = file.type || 'text/plain';
  let text = '';

  if (ext === 'pdf' || file.type === 'application/pdf') {
    fileType = 'application/pdf';
    text = await extractPdfTextInBrowser(file);
  } else if (ext === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value || '';
    } catch {
      // Fallback to parse-document endpoint
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/jobs/parse-document', { method: 'POST', body: formData });
      const data = await res.json();
      text = data.text || '';
    }
  } else if (ext === 'doc' || file.type === 'application/msword') {
    fileType = 'application/msword';
    // Use parse-document endpoint for binary .doc files
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/jobs/parse-document', { method: 'POST', body: formData });
    const data = await res.json();
    text = data.text || '';
  } else if (ext === 'csv' || file.type === 'text/csv') {
    fileType = 'text/csv';
    text = await file.text();
  } else {
    // txt or generic text
    fileType = 'text/plain';
    text = await file.text();
  }

  // Final check for PDF safety
  if (ext === 'pdf' || fileType === 'application/pdf') {
    if (!validateExtractedPdfText(text)) {
      throw new Error('PDF text extraction failed');
    }
  }

  return {
    text: text.trim(),
    fileName,
    fileType,
  };
}
