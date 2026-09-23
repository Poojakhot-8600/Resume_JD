import '@/utils/dns-fix';
import { NextResponse } from 'next/server';
import { extractTextFromFile, isSupportedFormat, resolveFileType } from '@/utils/documentParser';
import { validateExtractedPdfText } from '@/utils/clientPdfParser';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = (formData.get('file') || formData.get('files')) as File | null;

    if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
      return NextResponse.json(
        { error: 'No document file provided for parsing.' },
        { status: 400 }
      );
    }

    if (!isSupportedFormat(file.name)) {
      return NextResponse.json(
        { error: `File "${file.name}" has an unsupported format. Supported formats: .pdf, .docx, .doc, .csv, .txt` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    let extracted;
    try {
      extracted = await extractTextFromFile(buffer, file.name, file.type);
    } catch (parseErr: any) {
      if (isPdf) {
        return NextResponse.json(
          { error: 'PDF text extraction failed' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: parseErr.message || 'Failed to extract text from document.' },
        { status: 400 }
      );
    }

    const text = extracted.text ? extracted.text.trim() : '';

    if (isPdf) {
      if (!validateExtractedPdfText(text)) {
        return NextResponse.json(
          { error: 'PDF text extraction failed' },
          { status: 400 }
        );
      }
    }

    if (!text) {
      return NextResponse.json(
        { error: `Document "${file.name}" appears to be empty or unreadable.` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      text,
      fileName: file.name,
      fileType: resolveFileType(file.name, file.type),
      wordCount: extracted.wordCount,
      charCount: extracted.charCount,
    });
  } catch (error: any) {
    console.error('Document parsing endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse document.' },
      { status: 500 }
    );
  }
}
