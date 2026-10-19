import '@/utils/dns-fix';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';
import { extractTextFromFile, isSupportedFormat, resolveFileType } from '@/utils/documentParser';
import crypto from 'crypto';
import { createBatch, processCandidateBatchAsync } from '@/services/batchService';
import { UploadBatchResponse } from '@/types';

interface ResumePayloadItem {
  file_name: string;
  file_type: string;
  text: string;
  wordCount?: number;
  charCount?: number;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    const processedResumes: ResumePayloadItem[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      
      // Collect all files from 'files' or 'file' keys in FormData
      const uploadedFiles: File[] = [];
      const filesFromList = formData.getAll('files');
      const filesFromSingle = formData.getAll('file');

      for (const f of [...filesFromList, ...filesFromSingle]) {
        if (f && typeof f === 'object' && 'arrayBuffer' in f && (f as File).size > 0) {
          uploadedFiles.push(f as File);
        }
      }

      const directText = formData.get('resumeText') as string | null;

      if (uploadedFiles.length === 0 && (!directText || directText.trim().length === 0)) {
        return NextResponse.json(
          { error: 'No resume files or text provided. Please select at least one file.' },
          { status: 400 }
        );
      }

      // Process each file in the order uploaded
      for (const file of uploadedFiles) {
        if (!isSupportedFormat(file.name)) {
          return NextResponse.json(
            {
              error: `File "${file.name}" has an unsupported format. Supported formats: .pdf, .docx, .doc, .xlsx, .xls, .csv, .txt`,
            },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let extracted;
        try {
          extracted = await extractTextFromFile(buffer, file.name, file.type);
        } catch (err: any) {
          if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
            return NextResponse.json(
              { error: 'PDF text extraction failed' },
              { status: 400 }
            );
          }
          throw err;
        }

        const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
        if (
          !extracted.text ||
          extracted.text.trim().length === 0 ||
          (isPdf &&
            (extracted.text.startsWith('%PDF-') ||
              /\b(?:xref|endobj|%%EOF)\b/.test(extracted.text) ||
              extracted.text.includes('%PDF-')))
        ) {
          return NextResponse.json(
            {
              error: isPdf
                ? 'PDF text extraction failed'
                : `Failed to extract text from file "${file.name}". The document appears to be empty or unreadable.`,
            },
            { status: 400 }
          );
        }

        processedResumes.push({
          file_name: file.name,
          file_type: resolveFileType(file.name, file.type),
          text: extracted.text,
          wordCount: extracted.wordCount,
          charCount: extracted.charCount,
        });
      }

      // If direct text was submitted alongside or instead
      if (directText && directText.trim().length > 0) {
        const textVal = directText.trim();
        processedResumes.push({
          file_name: (formData.get('fileName') as string) || 'manual-resume.txt',
          file_type: 'text/plain',
          text: textVal,
          wordCount: textVal.split(/\s+/).filter(Boolean).length,
          charCount: textVal.length,
        });
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json();

      if (Array.isArray(body.resumes) && body.resumes.length > 0) {
        for (const item of body.resumes) {
          if (!item.text || typeof item.text !== 'string' || item.text.trim().length === 0) {
            return NextResponse.json(
              { error: `Item "${item.file_name || 'unnamed'}" does not contain valid text.` },
              { status: 400 }
            );
          }
          const textVal = item.text.trim();
          const fileName = item.file_name || 'resume.txt';
          processedResumes.push({
            file_name: fileName,
            file_type: item.file_type || resolveFileType(fileName),
            text: textVal,
            wordCount: textVal.split(/\s+/).filter(Boolean).length,
            charCount: textVal.length,
          });
        }
      } else if (body.text && typeof body.text === 'string' && body.text.trim().length > 0) {
        const textVal = body.text.trim();
        const fileName = body.fileName || body.file_name || 'pasted-resume.txt';
        processedResumes.push({
          file_name: fileName,
          file_type: resolveFileType(fileName),
          text: textVal,
          wordCount: textVal.split(/\s+/).filter(Boolean).length,
          charCount: textVal.length,
        });
      } else {
        return NextResponse.json(
          { error: 'Please provide at least one resume with non-empty text.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type. Use multipart/form-data or application/json.' },
        { status: 400 }
      );
    }

    if (processedResumes.length === 0) {
      return NextResponse.json(
        { error: 'No valid resumes found to process.' },
        { status: 400 }
      );
    }

    // Required Resume Webhook Payload structure:
    const webhookPayload = {
      resumes: processedResumes.map((r) => ({
        file_name: r.file_name,
        file_type: r.file_type,
        text: r.text,
      })),
    };

    // Determine target webhook URL for Candidate Resume
    const webhookUrl =
      process.env.N8N_CANDIDATE_RESUME_WEBHOOK_URL ||
      'https://pooja456.app.n8n.cloud/webhook-test/resume-insert';

    const secret = process.env.N8N_SHARED_SECRET || 'super-secret-key';

    // Generate unique batch ID
    const batchId = `batch_cand_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Register batch in Supabase upload_batches table
    const batch = await createBatch({
      id: batchId,
      userId: user.id,
      batchType: 'candidate',
      totalReceived: processedResumes.length,
      metadata: {
        file_names: processedResumes.map((r) => r.file_name),
      },
    });

    console.log(
      `[Candidate Resume Upload] Registered batch "${batchId}" with ${processedResumes.length} item(s). Starting async n8n processing...`
    );

    // Trigger asynchronous background worker without waiting for long-running workflow
    setImmediate(() => {
      processCandidateBatchAsync(batchId, user.id, processedResumes, webhookUrl, secret).catch(
        (err) => {
          console.error(`[Candidate Resume Upload] Background processing error for batch ${batchId}:`, err);
        }
      );
    });

    // Return accepted response with batch_id and processing status (never fabricated success counts)
    return NextResponse.json(
      {
        batch_id: batchId,
        status: 'processing',
        total_received: processedResumes.length,
        message: 'Files uploaded. Sending to n8n for processing...',
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('Error processing resume file upload:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process and upload resume(s).' },
      { status: 500 }
    );
  }
}
