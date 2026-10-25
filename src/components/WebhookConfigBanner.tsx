'use client';

import React, { useState, useEffect } from 'react';
import { 
  Network, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  Check
} from 'lucide-react';

interface WebhookConfigBannerProps {
  title: string;
  storageKey: string;
  currentUrl: string;
  onUrlChange: (url: string) => void;
  envDefaultUrl?: string;
  helpText?: string;
}

export function WebhookConfigBanner({
  title,
  storageKey,
  currentUrl,
  onUrlChange,
  envDefaultUrl = '',
  helpText,
}: WebhookConfigBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(currentUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    suggestion?: string;
    isSslIssue?: boolean;
    fallbackUrl?: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setInputVal(currentUrl);
  }, [currentUrl]);

  const handleTest = async () => {
    const urlToTest = inputVal.trim() || currentUrl.trim();
    if (!urlToTest) {
      setTestResult({
        success: false,
        message: 'Please provide a valid webhook URL.',
        suggestion: 'Enter your n8n published or test webhook URL.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/webhooks/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: urlToTest }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Connected successfully' : 'Connection failed'),
        suggestion: data.suggestion,
        isSslIssue: data.isSslIssue,
        fallbackUrl: data.fallbackUrl,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error while testing connection.',
        suggestion: 'Make sure your Next.js server is running and can reach the internet.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = inputVal.trim();
    if (trimmed) {
      localStorage.setItem(storageKey, trimmed);
    } else {
      localStorage.removeItem(storageKey);
    }
    onUrlChange(trimmed || envDefaultUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleReset = () => {
    localStorage.removeItem(storageKey);
    setInputVal(envDefaultUrl);
    onUrlChange(envDefaultUrl);
    setTestResult(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSwitchToHttp = () => {
    if (testResult?.fallbackUrl) {
      setInputVal(testResult.fallbackUrl);
      localStorage.setItem(storageKey, testResult.fallbackUrl);
      onUrlChange(testResult.fallbackUrl);
      setTestResult(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const isCustom = typeof window !== 'undefined' && Boolean(localStorage.getItem(storageKey));

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden transition-all">
      {/* Top Banner Row */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/70 border-b border-neutral-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Network className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-neutral-800">{title}</span>
              {isCustom ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  Custom Override
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                  Default from .env
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 font-mono truncate max-w-md sm:max-w-xl">
              {currentUrl || 'No webhook URL configured'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            )}
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 rounded-lg transition-colors cursor-pointer"
          >
            <span>{isOpen ? 'Hide Settings' : 'Change URL'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Test Result Message Bar */}
      {testResult && (
        <div
          className={`px-4 py-2.5 text-xs border-b flex items-start justify-between gap-3 animate-in fade-in duration-150 ${
            testResult.success
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : testResult.isSslIssue
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <div className="flex items-start gap-2">
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : testResult.isSslIssue ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold">{testResult.message}</div>
              {testResult.suggestion && (
                <div className="text-[11px] mt-0.5 opacity-90">{testResult.suggestion}</div>
              )}
            </div>
          </div>

          {testResult.isSslIssue && testResult.fallbackUrl && (
            <button
              type="button"
              onClick={handleSwitchToHttp}
              className="shrink-0 px-2.5 py-1 text-[11px] font-semibold bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer"
            >
              Switch to HTTP
            </button>
          )}
        </div>
      )}

      {/* Expandable Editor Row */}
      {isOpen && (
        <div className="p-4 space-y-3 bg-white">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-700">
              Target n8n Webhook Endpoint URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="http://n8n-domain:5678/webhook/..."
                className="flex-1 px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-2xs transition-colors cursor-pointer"
              >
                {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {saveSuccess ? 'Saved!' : 'Save'}
              </button>
              {isCustom && (
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset to .env default"
                  className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="text-[11px] text-neutral-500 space-y-1 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
            <p className="font-semibold text-neutral-700">Hostinger & n8n Tips:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                <strong>No SSL on Hostinger?</strong> If port 443 has no active SSL certificate, use <code className="text-indigo-600 font-mono">http://</code> instead of <code className="text-red-500 font-mono">https://</code>.
              </li>
              <li>
                <strong>Same Hostinger Server:</strong> If n8n runs in Docker on the same VPS, try <code className="text-indigo-600 font-mono">http://127.0.0.1:5678/webhook/...</code>
              </li>
              <li>
                <strong>Activate Workflow:</strong> In n8n, make sure the workflow toggle in the top-right is turned <strong>Active</strong> (Published).
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
