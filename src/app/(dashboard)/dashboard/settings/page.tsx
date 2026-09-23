'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, CheckCircle, AlertTriangle, HelpCircle, ShieldAlert, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const [jdWebhook, setJdWebhook] = useState('');
  const [candidateWebhook, setCandidateWebhook] = useState('');
  const [sharedSecret, setSharedSecret] = useState('');
  const [envConfigs, setEnvConfigs] = useState({
    jdWebhook: '',
    candidateWebhook: '',
    sharedSecret: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load configuration from env defaults and localStorage overrides
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        // Fetch default configurations from env via helper API
        const res = await fetch('/api/settings/defaults');
        if (res.ok) {
          const data = await res.json();
          setEnvConfigs({
            jdWebhook: data.envJdWebhook || '',
            candidateWebhook: data.envCandidateWebhook || '',
            sharedSecret: data.envSharedSecret || ''
          });
        }
      } catch (err) {
        console.error('Failed to fetch default env webhooks:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();

    // Load custom browser overrides from localStorage
    setJdWebhook(localStorage.getItem('n8n_jd_webhook_url') || '');
    setCandidateWebhook(localStorage.getItem('n8n_candidate_webhook_url') || '');
    setSharedSecret(localStorage.getItem('n8n_shared_secret') || '');
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Save configurations to localStorage
      if (jdWebhook.trim()) {
        localStorage.setItem('n8n_jd_webhook_url', jdWebhook.trim());
      } else {
        localStorage.removeItem('n8n_jd_webhook_url');
      }

      if (candidateWebhook.trim()) {
        localStorage.setItem('n8n_candidate_webhook_url', candidateWebhook.trim());
      } else {
        localStorage.removeItem('n8n_candidate_webhook_url');
      }

      if (sharedSecret.trim()) {
        localStorage.setItem('n8n_shared_secret', sharedSecret.trim());
      } else {
        localStorage.removeItem('n8n_shared_secret');
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('n8n_jd_webhook_url');
    localStorage.removeItem('n8n_candidate_webhook_url');
    localStorage.removeItem('n8n_shared_secret');
    setJdWebhook('');
    setCandidateWebhook('');
    setSharedSecret('');
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // Determine active values (custom overrides take precedence over env variables)
  const activeJdWebhook = jdWebhook.trim() || envConfigs.jdWebhook;
  const activeCandidateWebhook = candidateWebhook.trim() || envConfigs.candidateWebhook;
  const activeSharedSecret = sharedSecret.trim() || envConfigs.sharedSecret || 'super-secret-key';

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4 py-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/80 p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-32 w-32 bg-indigo-50/30 rounded-full blur-3xl -z-10" />

        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-indigo-600 text-white font-extrabold flex items-center justify-center rounded-xl shadow-sm">
            <Settings className="h-6 w-6 animate-spin-slow" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-neutral-900">Integration Settings</h2>
            <p className="text-sm text-neutral-500 font-medium">Manage and test your active n8n automation webhooks and connection credentials.</p>
          </div>
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings Form Column */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-neutral-800 border-b border-neutral-100 pb-3 block">
              n8n Webhook Configuration
            </h3>

            {/* Job Upload Webhook */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 block">
                Job Description Webhook URL
              </label>
              <input
                type="url"
                placeholder={envConfigs.jdWebhook || "https://your-n8n.com/webhook/jobs"}
                value={jdWebhook}
                onChange={(e) => setJdWebhook(e.target.value)}
                className="w-full text-xs p-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-mono"
              />
              <span className="text-[10px] text-neutral-400 font-medium block">
                Receives job details and coordinates parsing. Custom overrides set in browser take precedence.
              </span>
            </div>

            {/* Candidate Import Webhook */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 block">
                Candidate Import Webhook URL
              </label>
              <input
                type="url"
                placeholder={envConfigs.candidateWebhook || "https://your-n8n.com/webhook/candidates"}
                value={candidateWebhook}
                onChange={(e) => setCandidateWebhook(e.target.value)}
                className="w-full text-xs p-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-mono"
              />
              <span className="text-[10px] text-neutral-400 font-medium block">
                Fires in bulk when uploading candidate CSV/Excel files.
              </span>
            </div>

            {/* x-webhook-secret authorization header */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 block flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-neutral-400" />
                Shared Webhook Secret Header (x-webhook-secret)
              </label>
              <input
                type="text"
                placeholder={envConfigs.sharedSecret || "super-secret-key"}
                value={sharedSecret}
                onChange={(e) => setSharedSecret(e.target.value)}
                className="w-full text-xs p-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-mono"
              />
              <span className="text-[10px] text-neutral-400 font-medium block">
                Header key sent as security credentials to validate calls between this app and your n8n workflows.
              </span>
            </div>

            {/* Actions Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-neutral-100/50">
              <Button type="submit" disabled={isSaving} size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-bold px-5">
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Save Configuration
              </Button>
              
              <Button type="button" variant="outline" onClick={handleClear} size="sm" className="text-neutral-500 hover:text-neutral-800">
                Clear Overrides
              </Button>

              {saveStatus === 'success' && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 animate-fade-in font-bold ml-auto">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Configurations Stored!
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Current Info Sidebar Status Column */}
        <div className="space-y-6">
          
          {/* Active Integration Status Card */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-neutral-500">
              Connection Status
            </h4>

            {/* Job webhook info */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Job Parser Webhook</span>
              {activeJdWebhook ? (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-neutral-700 truncate font-mono max-w-[200px]" title={activeJdWebhook}>
                    {activeJdWebhook}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-neutral-400">
                  <span className="h-2 w-2 rounded-full bg-neutral-300" />
                  <span className="text-xs italic font-medium">Inactive (Local Mock Active)</span>
                </div>
              )}
            </div>

            {/* Candidate webhook info */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Candidate Import Webhook</span>
              {activeCandidateWebhook ? (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-neutral-700 truncate font-mono max-w-[200px]" title={activeCandidateWebhook}>
                    {activeCandidateWebhook}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-neutral-400">
                  <span className="h-2 w-2 rounded-full bg-neutral-300" />
                  <span className="text-xs italic font-medium">Inactive (Local Insert Active)</span>
                </div>
              )}
            </div>

            {/* Secret key info */}
            <div className="space-y-1 pt-1.5 border-t border-neutral-100">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">x-webhook-secret key</span>
              <span className="text-xs text-neutral-600 font-mono truncate block">
                {activeSharedSecret.substring(0, 12)}...
              </span>
            </div>
          </div>

          {/* Guidelines info */}
          <div className="bg-neutral-50/50 border border-neutral-200 bg-white rounded-2xl p-6 space-y-3.5">
            <div className="flex items-center gap-1.5 text-neutral-700">
              <HelpCircle className="h-5 w-5 text-indigo-500" />
              <h4 className="text-xs uppercase font-extrabold tracking-wider text-neutral-600 font-semibold">
                Setup Advice
              </h4>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed font-medium">
              Save Webhook endpoints above. Once defined, Job or Candidate Excel/CSV data uploaded in the system is forwarded to your workflow.
            </p>
            <div className="bg-white border border-neutral-200 rounded-xl p-3 flex gap-2 text-[10px] text-neutral-500 font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Ensure your n8n workflow returns a valid JSON response containing a success indicator.</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
