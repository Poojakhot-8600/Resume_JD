'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  FileText, 
  ArrowLeft, 
  Copy, 
  Check, 
  FileCode,
  Sparkles,
  X,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Send
} from 'lucide-react';

interface ProcessedResumeItem {
  file_name: string;
  file_type: string;
  text: string;
  wordCount: number;
  charCount: number;
}

interface BatchUploadResult {
  success: boolean;
  count: number;
  resumes: ProcessedResumeItem[];
  webhookPayload: {
    resumes: Array<{
      file_name: string;
      file_type: string;
      text: string;
    }>;
  };
  webhookSuccess: boolean;
  webhookStatus: number;
  webhookMessage: string;
  webhookUrl: string;
  webhookResponse?: any;
}

export default function UploadCandidateResumePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<BatchUploadResult | null>(null);
  const [manualText, setManualText] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [expandedFileIdx, setExpandedFileIdx] = useState<number | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedTextIdx, setCopiedTextIdx] = useState<number | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>(
    process.env.NEXT_PUBLIC_N8N_CANDIDATE_RESUME_WEBHOOK_URL || 'https://pooja456.app.n8n.cloud/webhook-test/resume-insert'
  );

  React.useEffect(() => {
    // Check if custom browser override exists in localStorage
    const saved = localStorage.getItem('n8n_candidate_webhook_url');
    if (saved && saved.trim()) {
      setWebhookUrl(saved.trim());
      return;
    }

    // Otherwise fetch the current .env webhook from the server
    fetch('/api/settings/defaults')
      .then((res) => res.json())
      .then((data) => {
        if (data?.envCandidateWebhook) {
          setWebhookUrl(data.envCandidateWebhook);
        }
      })
      .catch((err) => console.error('Failed to fetch Candidate webhook from settings:', err));
  }, []);

  // Helper: format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Add files to selection (maintaining order)
  const handleAddFiles = (files: FileList | File[]) => {
    setError(null);
    setBatchResult(null);
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...fileArray]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  // Add manual text as a virtual file
  const handleAddManualText = () => {
    if (!manualText.trim()) {
      setError('Please enter candidate resume text.');
      return;
    }

    const title = manualTitle.trim() || `pasted-resume-${Date.now().toString().slice(-4)}.txt`;
    const textBlob = new Blob([manualText.trim()], { type: 'text/plain' });
    const file = new File([textBlob], title.endsWith('.txt') ? title : `${title}.txt`, { type: 'text/plain' });

    handleAddFiles([file]);
    setManualText('');
    setManualTitle('');
    setShowManualInput(false);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
    setBatchResult(null);
    setError(null);
  };

  // Upload and Send ALL selected files in ONE single webhook request
  const handleUploadAll = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one resume file to upload.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setBatchResult(null);

    try {
      const formData = new FormData();
      // Append all files in the order they were selected
      for (const file of selectedFiles) {
        formData.append('files', file);
      }

      const res = await fetch('/api/candidates/upload-resume', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process and upload resumes.');
      }

      setBatchResult(data);
    } catch (err: any) {
      console.error('Batch resume upload error:', err);
      setError(err.message || 'An error occurred while uploading resumes.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyPayload = () => {
    if (!batchResult?.webhookPayload) return;
    navigator.clipboard.writeText(JSON.stringify(batchResult.webhookPayload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleCopyText = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextIdx(index);
    setTimeout(() => setCopiedTextIdx(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between pb-6 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Upload Candidate Resumes
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
              <Sparkles className="h-3 w-3" />
              Single Batch Request
            </span>
          </div>
          <p className="mt-1.5 text-sm text-neutral-500">
            Select 1 or multiple candidate resumes (.pdf, .docx, .doc, .txt, or .csv). All files are processed and delivered together in <strong>ONE webhook request</strong> under the <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-neutral-800 font-semibold">{`"resumes": [...]`}</code> array.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard/candidates')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 shadow-xs border border-neutral-300 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Candidates
          </button>
        </div>
      </div>

      {/* Webhook Info Card */}
      <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white border border-neutral-200 shadow-xs text-indigo-600 mt-0.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Target n8n Webhook</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-700 mt-1 break-all select-all">
                {batchResult?.webhookUrl || webhookUrl}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] text-neutral-500">Required Payload Format</span>
            <p className="text-xs font-mono text-indigo-600 font-semibold">{`{ "resumes": [ { file_name, file_type, text } ] }`}</p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 animate-in fade-in duration-150">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-medium">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload Dropzone */}
      <div className="space-y-4">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50/50 scale-[1.005]'
              : 'border-neutral-300 hover:border-indigo-400 bg-white hover:bg-neutral-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 shadow-inner">
            <UploadCloud className="h-8 w-8" />
          </div>

          <h3 className="text-base font-bold text-neutral-900">
            Drop candidate resume file(s) here, or <span className="text-indigo-600 underline">browse</span>
          </h3>
          <p className="text-xs text-neutral-500 mt-1.5 max-w-md mx-auto">
            Select 1, 3, 5, or more resumes. Supports <span className="font-semibold text-neutral-700">.pdf, .docx, .doc, .csv, .txt</span>. All files will be sent together in ONE request.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {['PDF (.pdf)', 'Word (.docx, .doc)', 'CSV (.csv)', 'Text (.txt)'].map((fmt) => (
              <span
                key={fmt}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-600"
              >
                <FileCode className="h-3 w-3 text-neutral-500" />
                {fmt}
              </span>
            ))}
          </div>
        </div>

        {/* Manual Paste Toggle Button */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer"
          >
            {showManualInput ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showManualInput ? 'Hide direct text paste' : '+ Paste raw resume text manually'}
          </button>
          <span className="text-xs text-neutral-400">
            {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} selected
          </span>
        </div>

        {/* Manual Text Input Drawer */}
        {showManualInput && (
          <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Paste Resume Text
              </span>
              <span className="text-[11px] text-neutral-400">
                {manualText.length} characters | {manualText.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>

            <input
              type="text"
              placeholder="Candidate Name or Identifier (e.g. Maya Patel - Senior Engineer)"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
            />

            <textarea
              rows={6}
              placeholder="Paste raw resume text here... (experience, skills, education, summary)"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowManualInput(false);
                  setManualText('');
                  setManualTitle('');
                }}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddManualText}
                disabled={!manualText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Play className="h-3 w-3" />
                Add to Selected Batch
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Files Staging List (Before / After Upload) */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <span>Selected Resumes for Batch</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'}
                  </span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  All {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} will be packaged into a single JSON payload and delivered in <strong>ONE webhook request</strong>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-neutral-600 hover:text-red-600 hover:bg-neutral-100 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear List
                </button>
                <button
                  type="button"
                  onClick={handleUploadAll}
                  disabled={isProcessing || selectedFiles.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-sm transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Extracting & Sending ONE Batch...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send {selectedFiles.length} Resume{selectedFiles.length === 1 ? '' : 's'} in ONE Request</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Selected File Items */}
            <div className="divide-y divide-neutral-100 border-t border-neutral-100 pt-1">
              {selectedFiles.map((file, idx) => {
                const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
                return (
                  <div key={`${file.name}-${idx}`} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-neutral-400 text-[11px] w-5">#{idx + 1}</span>
                      <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span className="font-medium text-neutral-900 truncate max-w-sm sm:max-w-md">{file.name}</span>
                      <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 shrink-0">
                        {ext}
                      </span>
                      <span className="text-neutral-400 text-[11px] shrink-0">{formatFileSize(file.size)}</span>
                    </div>

                    {!isProcessing && !batchResult && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1 text-neutral-400 hover:text-red-600 rounded hover:bg-neutral-100 cursor-pointer"
                        title="Remove from batch"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Batch Result Inspection Card */}
      {batchResult && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    <span>Batch Upload Successful</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      HTTP {batchResult.webhookStatus}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {batchResult.count} resume{batchResult.count === 1 ? '' : 's'} extracted and delivered in <strong>ONE webhook request</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer"
                >
                  {copiedPayload ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied Payload</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Webhook Payload JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Webhook Status Notice */}
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-neutral-500">n8n Status:</span>{' '}
                <span className="font-semibold text-neutral-800">{batchResult.webhookMessage}</span>
              </div>
              <span className="text-neutral-400 font-mono text-[11px]">Request Method: POST application/json</span>
            </div>

            {/* Itemized List of Resumes in the Webhook Payload */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
                Delivered Resumes ({batchResult.resumes.length})
              </span>
              <div className="space-y-2">
                {batchResult.resumes.map((item, idx) => {
                  const isExpanded = expandedFileIdx === idx;
                  return (
                    <div key={`${item.file_name}-${idx}`} className="border border-neutral-200 rounded-lg overflow-hidden">
                      <div className="p-3.5 bg-neutral-50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-neutral-400 text-[11px] w-5">#{idx + 1}</span>
                          <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                          <span className="font-semibold text-neutral-900 truncate max-w-xs sm:max-w-md">
                            {item.file_name}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-neutral-200 text-neutral-600 shrink-0">
                            {item.file_type}
                          </span>
                          <span className="text-neutral-500 text-[11px] shrink-0">
                            {item.wordCount} words • {item.charCount} chars
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyText(idx, item.text)}
                            className="p-1 text-neutral-500 hover:text-neutral-900 text-xs font-medium flex items-center gap-1 cursor-pointer"
                          >
                            {copiedTextIdx === idx ? (
                              <span className="text-emerald-600 font-semibold">Copied!</span>
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedFileIdx(isExpanded ? null : idx)}
                            className="p-1 text-neutral-500 hover:text-neutral-900 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide Text' : 'View Text'}</span>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-neutral-200 space-y-2">
                          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                            Extracted Text Sent in Payload
                          </span>
                          <div className="p-3 bg-neutral-50 rounded border border-neutral-200 max-h-56 overflow-y-auto font-mono text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap select-all">
                            {item.text}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Webhook Payload Inspection */}
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 block">
                Dispatched Webhook JSON Payload
              </span>
              <pre className="bg-neutral-900 text-neutral-100 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-64 leading-relaxed">
                {JSON.stringify(batchResult.webhookPayload, null, 2)}
              </pre>
            </div>
          </div>

          {/* Directory Link */}
          <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  {batchResult.count} {batchResult.count === 1 ? 'Resume' : 'Resumes'} Delivered
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Your n8n workflow received the array under <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">{`"resumes"`}</code> for splitting and evaluation.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/candidates')}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-semibold shadow-xs cursor-pointer text-center"
            >
              View Candidates Directory →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
