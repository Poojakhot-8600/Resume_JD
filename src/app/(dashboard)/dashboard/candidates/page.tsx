'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { 
  Users, 
  Plus, 
  Mail, 
  Eye, 
  Search, 
  Loader2, 
  Upload, 
  FileText, 
  Copy, 
  Check, 
  Briefcase, 
  Sparkles, 
  Database,
  ExternalLink,
  Phone,
  Calendar,
  CheckCircle2
} from 'lucide-react';

import { CandidateItem, JobMinimal } from '@/types';

const inviteSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  jobId: z.string().min(1, 'Please select a job opening'),
});

type InviteValues = z.infer<typeof inviteSchema>;

export default function CandidatesPage() {
  const [candidates, setCandidates] = React.useState<CandidateItem[]>([]);
  const [activeJobs, setActiveJobs] = React.useState<JobMinimal[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [sendingEmailId, setSendingEmailId] = React.useState<string | null>(null);

  // Selected candidate for viewing full summary / resume
  const [selectedResumeCandidate, setSelectedResumeCandidate] = React.useState<CandidateItem | null>(null);
  const [copied, setCopied] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: '', email: '', phone: '', jobId: '' },
  });

  // Fetch candidates
  const loadCandidates = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/candidates');
      const data = await res.json();
      if (data.candidates) setCandidates(data.candidates);
    } catch (err) {
      console.error('Error loading candidates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch active jobs
  const loadActiveJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.jobs) {
        setActiveJobs(data.jobs.filter((j: any) => j.status === 'ACTIVE'));
      }
    } catch (err) {
      console.error('Error loading jobs:', err);
    }
  };

  React.useEffect(() => {
    loadCandidates();
    loadActiveJobs();
  }, []);

  const onInviteSubmit = async (data: InviteValues) => {
    try {
      const res = await fetch('/api/candidates/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to invite candidate');

      setIsInviteOpen(false);
      reset();
      loadCandidates();
    } catch (err: any) {
      alert(err.message || 'Error inviting candidate');
    }
  };

  const handleResendInvite = async (candidateId: string) => {
    try {
      setSendingEmailId(candidateId);
      const res = await fetch(`/api/candidates/${candidateId}/resend`, {
        method: 'POST',
      });
      if (res.ok) {
        alert('Assessment invitation email re-sent successfully!');
      } else {
        alert('Failed to resend invitation email.');
      }
    } catch (err) {
      console.error('Error resending email:', err);
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleShortlist = async (candidateId: string) => {
    try {
      const res = await fetch(`/api/candidates/${candidateId}/shortlist`, {
        method: 'POST',
      });
      if (res.ok) {
        alert('Candidate shortlisted! Assessment scheduling invitation has been sent.');
        loadCandidates();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to shortlist candidate.');
      }
    } catch (err) {
      console.error('Error shortlisting candidate:', err);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    const candidateName = c.name || '';
    const candidateEmail = c.email || '';
    const candidateId = c.candidateId || '';
    const jobTitle = c.job?.title || '';
    const currentTitle = c.currentJobTitle || '';
    const company = c.currentCompany || '';

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      candidateName.toLowerCase().includes(query) ||
      candidateEmail.toLowerCase().includes(query) ||
      candidateId.toLowerCase().includes(query) ||
      jobTitle.toLowerCase().includes(query) ||
      currentTitle.toLowerCase().includes(query) ||
      company.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'ALL' || c.assessmentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EVALUATED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'STARTED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'INVITED':
        return 'bg-neutral-100 text-neutral-600 border-neutral-200';
      case 'SHORTLISTED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SCHEDULED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  // Helper to parse skills (can be array, JSON string, or object)
  const parseSkillsList = (rawSkills: any): string[] => {
    if (!rawSkills) return [];
    if (Array.isArray(rawSkills)) return rawSkills;
    if (typeof rawSkills === 'string') {
      try {
        const parsed = JSON.parse(rawSkills);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return rawSkills.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  // Table Columns matching user's exact specification
  const columns: ColumnDef<CandidateItem>[] = [
    {
      header: 'Candidate',
      accessorKey: 'name',
      sortable: true,
      cell: (c: CandidateItem) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-neutral-900">{c.name || 'Unnamed Candidate'}</span>
            {c.candidateId && (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded font-mono text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {c.candidateId}
              </span>
            )}
          </div>
          <div className="text-[11px] text-neutral-500 font-medium">{c.email}</div>
          {c.phone && (
            <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
              <Phone className="h-2.5 w-2.5" />
              <span>{c.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Experience',
      accessorKey: 'yearsOfExperience',
      sortable: true,
      cell: (c: CandidateItem) => {
        const expNum = c.yearsOfExperience ? parseFloat(c.yearsOfExperience.toString()) : null;
        return (
          <div className="max-w-[170px]">
            <div className="text-xs font-bold text-neutral-800">
              {expNum !== null && !isNaN(expNum) ? `${expNum} yrs experience` : 'Not Specified'}
            </div>
            {(c.currentJobTitle || c.currentCompany) && (
              <div className="text-[11px] text-neutral-500 truncate" title={`${c.currentJobTitle || ''} ${c.currentCompany ? `at ${c.currentCompany}` : ''}`}>
                {c.currentJobTitle || 'Candidate'} {c.currentCompany && <span className="text-neutral-400">• {c.currentCompany}</span>}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Skills',
      accessorKey: 'skills',
      cell: (c: CandidateItem) => {
        const skillsArray = parseSkillsList(c.skills);
        if (skillsArray.length === 0) {
          return <span className="text-[11px] text-neutral-400 italic">No skills listed</span>;
        }

        const visibleSkills = skillsArray.slice(0, 3);
        const remainingCount = skillsArray.length - 3;

        return (
          <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
            {visibleSkills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200"
              >
                {skill}
              </span>
            ))}
            {remainingCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedResumeCandidate(c)}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 cursor-pointer"
                title={`Click to view all ${skillsArray.length} skills`}
              >
                +{remainingCount} more
              </button>
            )}
          </div>
        );
      },
    },
    {
      header: 'Resume Summary',
      accessorKey: 'summary',
      cell: (c: CandidateItem) => {
        const displayText = c.summary || c.resumeText;
        if (!displayText) {
          return <span className="text-[11px] text-neutral-400 italic">No summary</span>;
        }

        return (
          <div className="max-w-[240px]">
            <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
              {displayText}
            </p>
            <button
              type="button"
              onClick={() => setSelectedResumeCandidate(c)}
              className="mt-0.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <FileText className="h-3 w-3" />
              Read Summary
            </button>
          </div>
        );
      },
    },
    {
      header: 'Assessment Status',
      accessorKey: 'assessmentStatus',
      sortable: true,
      cell: (c: CandidateItem) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-sm border uppercase ${getStatusColor(
            c.assessmentStatus
          )}`}
        >
          {c.assessmentStatus}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (c: CandidateItem) => (
        <div className="flex items-center justify-end gap-1.5">
          {c.assessmentStatus === 'INVITED' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs font-semibold cursor-pointer border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                onClick={() => handleShortlist(c.id)}
                title="Shortlist Candidate"
              >
                Shortlist
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer text-neutral-500 hover:text-neutral-800"
                onClick={() => handleResendInvite(c.id)}
                disabled={sendingEmailId === c.id}
                title="Resend invitation mail"
              >
                {sendingEmailId === c.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
              </Button>
            </>
          )}
          <Link href={`/dashboard/candidates/${c.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 cursor-pointer"
              title="View details & scorecard"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">Candidates Directory</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Database className="h-3 w-3" />
              Synced with Supabase
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Candidate profiles, extracted resume summaries, skills, and assessment scores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/candidates/upload">
            <Button size="sm" variant="outline" className="cursor-pointer gap-1.5 border-neutral-200">
              <Upload className="h-4 w-4" />
              <span>Upload Candidate Resume</span>
            </Button>
          </Link>
          <Button size="sm" className="cursor-pointer gap-1" onClick={() => setIsInviteOpen(true)}>
            <Plus className="h-4.5 w-4.5" />
            <span>Invite Candidate</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Candidates</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-neutral-900">{candidates.length}</p>
          <span className="text-[11px] text-neutral-400">table: candidates</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Invited / Shortlisted</span>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">
            {candidates.filter((c) => c.assessmentStatus === 'INVITED' || c.assessmentStatus === 'SHORTLISTED').length}
          </p>
          <span className="text-[11px] text-neutral-400">ready for assessment</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Evaluated / Completed</span>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-neutral-900">
            {candidates.filter((c) => c.assessmentStatus === 'COMPLETED' || c.assessmentStatus === 'EVALUATED').length}
          </p>
          <span className="text-[11px] text-neutral-400">graded profiles</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, ID, email, title, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-lg border border-neutral-200 bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 cursor-pointer"
          >
            <option value="ALL">All States</option>
            <option value="INVITED">Invited</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="STARTED">Started</option>
            <option value="COMPLETED">Completed</option>
            <option value="EVALUATED">Evaluated</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-white border border-neutral-200 rounded-xl shadow-xs">
          <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full" />
          <span className="text-xs text-neutral-400">Loading candidate directory...</span>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-3 px-4 bg-white border border-neutral-200 rounded-xl shadow-xs">
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-neutral-400 inline-block w-fit mx-auto">
            <Users className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-neutral-900">No Candidates Found</h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Upload candidate resumes or invite new applicants to start building your directory.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Link href="/dashboard/candidates/upload">
              <Button variant="outline" size="sm" className="cursor-pointer gap-1.5 border-neutral-200">
                <Upload className="h-4 w-4" />
                <span>Upload Candidate Resume</span>
              </Button>
            </Link>
            <Button size="sm" className="cursor-pointer" onClick={() => setIsInviteOpen(true)}>
              Invite Candidate
            </Button>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredCandidates}
          itemsPerPage={10}
        />
      )}

      {/* Resume Summary Modal */}
      {selectedResumeCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs">
          <div className="relative z-50 w-full max-w-2xl border border-neutral-200 bg-white p-6 shadow-2xl rounded-2xl text-neutral-900 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900">{selectedResumeCandidate.name}</h3>
                  {selectedResumeCandidate.candidateId && (
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {selectedResumeCandidate.candidateId}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {selectedResumeCandidate.email} {selectedResumeCandidate.phone && `• ${selectedResumeCandidate.phone}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResumeCandidate(null)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-md hover:bg-neutral-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Skills */}
            {selectedResumeCandidate.skills && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Candidate Skills</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-neutral-50 rounded-lg border border-neutral-200">
                  {parseSkillsList(selectedResumeCandidate.skills).map((skill, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-white text-neutral-800 border border-neutral-300 shadow-2xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary / Resume Text */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {selectedResumeCandidate.summary && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Resume Summary</span>
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
                    {selectedResumeCandidate.summary}
                  </div>
                </div>
              )}

              {selectedResumeCandidate.resumeText && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Extracted Resume Text</span>
                  <div className="p-3 bg-neutral-900 text-neutral-100 rounded-xl font-mono text-xs leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap selection:bg-indigo-600 selection:text-white">
                    {selectedResumeCandidate.resumeText}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyText(selectedResumeCandidate.summary || selectedResumeCandidate.resumeText || '')}
                className="cursor-pointer gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </Button>

              <Button
                size="sm"
                onClick={() => setSelectedResumeCandidate(null)}
                className="cursor-pointer"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Candidate Modal */}
      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite New Candidate">
        <form onSubmit={handleSubmit(onInviteSubmit)} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-700">Full Name</label>
            <Input {...register('name')} placeholder="Jane Doe" className="mt-1" />
            {errors.name && <span className="text-xs text-red-600 mt-0.5 block">{errors.name.message}</span>}
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700">Email Address</label>
            <Input {...register('email')} type="email" placeholder="jane@example.com" className="mt-1" />
            {errors.email && <span className="text-xs text-red-600 mt-0.5 block">{errors.email.message}</span>}
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700">Phone (Optional)</label>
            <Input {...register('phone')} placeholder="+1 (555) 000-0000" className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700">Associated Job Position</label>
            <select
              {...register('jobId')}
              className="mt-1 w-full rounded-sm border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
            >
              <option value="">Select a job opening...</option>
              {activeJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
            {errors.jobId && <span className="text-xs text-red-600 mt-0.5 block">{errors.jobId.message}</span>}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
            <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
