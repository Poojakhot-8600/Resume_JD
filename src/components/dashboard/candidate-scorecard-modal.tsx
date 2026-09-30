'use client';

import * as React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  X, 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MatchedCandidate } from '@/types';
import { parseJsonField } from '@/utils/scorecard';

interface CandidateScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: MatchedCandidate | null;
  onBackToJob?: () => void;
}

function formatScore(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '-';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return '-';
  return num.toFixed(1);
}

function getBandBadgeStyle(band: string | null | undefined): string {
  const b = (band || '').toLowerCase();
  if (b.includes('strong')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  }
  if (b.includes('good')) {
    return 'bg-blue-100 text-blue-800 border-blue-300';
  }
  if (b.includes('partial')) {
    return 'bg-amber-100 text-amber-800 border-amber-300';
  }
  if (b.includes('weak')) {
    return 'bg-red-100 text-red-800 border-red-300';
  }
  return 'bg-neutral-100 text-neutral-800 border-neutral-200';
}

export const CandidateScorecardModal: React.FC<CandidateScorecardModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onBackToJob,
}) => {
  const [showGoodMatched, setShowGoodMatched] = React.useState(true);
  const [showGoodMissing, setShowGoodMissing] = React.useState(true);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !candidate) return null;

  const matchedSkills = parseJsonField<string[]>(candidate.matched_skills, []);
  const gapSkills = parseJsonField<string[]>(candidate.gap_skills, []);
  const knockoutFlags = parseJsonField<string[]>(candidate.knockout_flags, []);
  const explanation = parseJsonField<Record<string, any>>(candidate.explanation, {});
  const goodToHaveMatched: string[] = Array.isArray(explanation.good_to_have_matched)
    ? explanation.good_to_have_matched
    : [];
  const goodToHaveMissing: string[] = Array.isArray(explanation.good_to_have_missing)
    ? explanation.good_to_have_missing
    : [];

  const isBlocked = (candidate.knockout_status || '').toUpperCase() === 'BLOCKED';

  const dimensions = [
    { label: 'Skills match', score: candidate.score_skills },
    { label: 'Relevant experience', score: candidate.score_experience },
    { label: 'Responsibilities alignment', score: candidate.score_responsibilities },
    { label: 'Domain / industry', score: candidate.score_domain },
    { label: 'Seniority / scope', score: candidate.score_seniority },
    { label: 'Education & certifications', score: candidate.score_education },
  ];

  const candidateDisplayName =
    candidate.candidateName || candidate.candidate_name || 'Candidate';
  const roleTitle = candidate.jobTitle || candidate.job_title || 'Role';
  const roleSeniority = candidate.jobSeniority || candidate.job_seniority;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/40 backdrop-blur-xs">
      <div className="relative z-50 w-full max-w-4xl max-h-[90vh] flex flex-col bg-white border border-neutral-200 shadow-2xl rounded-2xl text-neutral-900 overflow-hidden">
        {/* Top Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/60 shrink-0">
          <div className="flex items-center gap-3">
            {onBackToJob && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBackToJob}
                className="cursor-pointer gap-1.5 text-xs h-8 border-neutral-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to candidates</span>
              </Button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {candidate.jobCode || candidate.job_code || 'JOB'}
                </span>
                <h3 className="text-base font-bold text-neutral-900">
                  Candidate Scorecard
                </h3>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-1.5 rounded-md hover:bg-neutral-200/50 cursor-pointer"
            aria-label="Close Scorecard"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION A: Candidate Details */}
          <div className="bg-neutral-50/80 rounded-xl p-4 border border-neutral-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-neutral-200">
              <div>
                <h4 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <span>{candidateDisplayName}</span>
                  <span className="font-mono text-[11px] font-semibold text-neutral-600 bg-white px-2 py-0.5 rounded border border-neutral-200">
                    ID: {candidate.candidateId || candidate.candidate_id || '-'}
                  </span>
                </h4>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                  {candidate.candidateEmail || candidate.candidate_email || '-'}
                </p>
              </div>

              {onBackToJob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBackToJob}
                  className="cursor-pointer gap-1 text-xs h-7 border-neutral-200 bg-white"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Back to job</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-neutral-400 block tracking-wider">
                  Phone
                </span>
                <span className="font-medium text-neutral-800">
                  {candidate.phone || '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-neutral-400 block tracking-wider">
                  Current Title
                </span>
                <span
                  className="font-medium text-neutral-800 truncate block"
                  title={candidate.current_job_title || ''}
                >
                  {candidate.current_job_title || '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-neutral-400 block tracking-wider">
                  Company
                </span>
                <span
                  className="font-medium text-neutral-800 truncate block"
                  title={candidate.current_company || ''}
                >
                  {candidate.current_company || '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-neutral-400 block tracking-wider">
                  Experience
                </span>
                <span className="font-medium text-neutral-800">
                  {candidate.years_of_experience
                    ? `${candidate.years_of_experience} yrs`
                    : '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-neutral-400 block tracking-wider">
                  Seniority
                </span>
                <span className="font-medium text-neutral-800">
                  {candidate.candidate_seniority || candidate.seniority || '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-neutral-400 block tracking-wider">
                  Location
                </span>
                <span
                  className="font-medium text-neutral-800 truncate block"
                  title={candidate.location || ''}
                >
                  {candidate.location || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION B: Score Header */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
              {/* Large Hero Box: match_percent followed by % */}
              <div className="sm:col-span-5 bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                  Overall Match Score
                </span>
                <div className="text-5xl font-black text-emerald-950 tracking-tight flex items-baseline justify-center">
                  <span>{candidate.match_percent ?? candidate.score ?? 0}</span>
                  <span className="text-3xl font-bold text-emerald-700 ml-0.5">%</span>
                </div>
              </div>

              {/* Small Table Beside It: Band, Coverage, Gate */}
              <div className="sm:col-span-7 bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col justify-between shadow-xs">
                <table className="w-full text-xs divide-y divide-neutral-100 h-full">
                  <tbody>
                    <tr className="hover:bg-neutral-50/50">
                      <td className="px-4 py-2.5 font-bold text-neutral-500 w-1/3 bg-neutral-50/50">
                        Band
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-neutral-900">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getBandBadgeStyle(
                            candidate.band
                          )}`}
                        >
                          {candidate.band || 'Good match'}
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-neutral-50/50">
                      <td className="px-4 py-2.5 font-bold text-neutral-500 bg-neutral-50/50">
                        Coverage
                      </td>
                      <td className="px-4 py-2.5 text-neutral-800 font-medium">
                        {candidate.coverage_text ||
                          (candidate.coverage_matched && candidate.coverage_total
                            ? `${candidate.coverage_matched} of ${candidate.coverage_total} must-haves (${
                                candidate.coverage_percent || 0
                              }%)`
                            : '-')}
                      </td>
                    </tr>
                    <tr className="hover:bg-neutral-50/50">
                      <td className="px-4 py-2.5 font-bold text-neutral-500 bg-neutral-50/50">
                        Gate
                      </td>
                      <td className="px-4 py-2.5 font-semibold">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                            <XCircle className="h-3 w-3 text-red-600" />
                            <span>BLOCKED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>CLEAR</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Italic caption */}
            <p className="text-xs italic text-neutral-500 px-1">
              Candidate: <span className="font-semibold text-neutral-700 not-italic">{candidateDisplayName}</span> · Role: <span className="font-semibold text-neutral-700 not-italic">{roleTitle}</span>
              {roleSeniority ? ` (${roleSeniority})` : ''}
            </p>

            {/* If knockout_status = BLOCKED, show banner */}
            {isBlocked && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-900">
                <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-md border border-red-200 uppercase tracking-wider">
                      Needs manual review
                    </span>
                    <span className="font-semibold text-red-950">
                      Knockout criteria triggered
                    </span>
                  </div>
                  {knockoutFlags.length > 0 ? (
                    <ul className="list-disc list-inside text-red-800 text-[11px] space-y-0.5 pl-1">
                      {knockoutFlags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-red-800">
                      One or more mandatory screening conditions were not met.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* If data_confidence < 100, show small note */}
            {typeof candidate.data_confidence === 'number' && candidate.data_confidence < 100 && (
              <div className="text-[11px] text-amber-800 bg-amber-50/90 border border-amber-200 rounded-lg p-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>
                  Some dimensions could not be scored (confidence {candidate.data_confidence}%)
                </span>
              </div>
            )}
          </div>

          {/* SECTION C: Dimension breakdown table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Dimension breakdown
            </h4>

            <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-900 text-white">
                    <th className="h-9 px-4 text-left font-semibold uppercase tracking-wider text-[11px]">
                      Dimension
                    </th>
                    <th className="h-9 px-4 text-right font-semibold uppercase tracking-wider text-[11px] w-48">
                      Score (0–100)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {dimensions.map((dim, idx) => {
                    const scoreStr = formatScore(dim.score);
                    const scoreNum =
                      dim.score !== null && dim.score !== undefined && dim.score !== ''
                        ? parseFloat(String(dim.score))
                        : null;

                    return (
                      <tr key={idx} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-neutral-800">
                          {dim.label}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-neutral-900">
                          <div className="flex items-center justify-end gap-3">
                            {scoreNum !== null && !isNaN(scoreNum) && (
                              <div className="w-24 bg-neutral-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    scoreNum >= 80
                                      ? 'bg-emerald-500'
                                      : scoreNum >= 60
                                      ? 'bg-indigo-500'
                                      : scoreNum >= 40
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{
                                    width: `${Math.min(Math.max(scoreNum, 0), 100)}%`,
                                  }}
                                />
                              </div>
                            )}
                            <span className="w-10 text-right">{scoreStr}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION D: Matched requirements | Gaps */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left, green: matched_skills */}
              <div className="bg-emerald-50/30 border border-emerald-200/80 rounded-xl p-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Matched requirements</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {matchedSkills.length}
                  </span>
                </div>

                <div className="space-y-1.5 flex-1">
                  {matchedSkills.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic py-2">None</p>
                  ) : (
                    matchedSkills.map((skill, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-emerald-100/70 border border-emerald-200/80 text-xs text-emerald-950 font-medium leading-relaxed flex items-start gap-2"
                      >
                        <span className="text-emerald-600 mt-0.5">•</span>
                        <span>{skill}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right, amber: gap_skills */}
              <div className="bg-amber-50/30 border border-amber-200/80 rounded-xl p-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                  <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Gaps</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {gapSkills.length}
                  </span>
                </div>

                <div className="space-y-1.5 flex-1">
                  {gapSkills.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic py-2">None</p>
                  ) : (
                    gapSkills.map((gap, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-amber-100/70 border border-amber-200/80 text-xs text-amber-950 font-medium leading-relaxed flex items-start gap-2"
                      >
                        <span className="text-amber-600 mt-0.5">•</span>
                        <span>{gap}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Collapsible Sections: Good-to-have matched & Good-to-have missing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Good-to-have matched */}
              <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowGoodMatched(!showGoodMatched)}
                  className="w-full px-4 py-2.5 bg-neutral-50 hover:bg-neutral-100/80 flex items-center justify-between text-left font-semibold text-neutral-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Good-to-have matched</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {goodToHaveMatched.length}
                    </span>
                  </div>
                  {showGoodMatched ? (
                    <ChevronUp className="h-3.5 w-3.5 text-neutral-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                  )}
                </button>
                {showGoodMatched && (
                  <div className="p-3 border-t border-neutral-100 space-y-1.5 bg-neutral-50/30">
                    {goodToHaveMatched.length === 0 ? (
                      <p className="text-neutral-400 italic py-1">None</p>
                    ) : (
                      goodToHaveMatched.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-neutral-700">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{item}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Good-to-have missing */}
              <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowGoodMissing(!showGoodMissing)}
                  className="w-full px-4 py-2.5 bg-neutral-50 hover:bg-neutral-100/80 flex items-center justify-between text-left font-semibold text-neutral-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span>Good-to-have missing</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {goodToHaveMissing.length}
                    </span>
                  </div>
                  {showGoodMissing ? (
                    <ChevronUp className="h-3.5 w-3.5 text-neutral-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                  )}
                </button>
                {showGoodMissing && (
                  <div className="p-3 border-t border-neutral-100 space-y-1.5 bg-neutral-50/30">
                    {goodToHaveMissing.length === 0 ? (
                      <p className="text-neutral-400 italic py-1">None</p>
                    ) : (
                      goodToHaveMissing.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-neutral-700">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{item}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-neutral-200 bg-neutral-50/60 shrink-0">
          <span className="text-xs text-neutral-400 font-mono">
            Candidate ID: {candidate.candidateId || candidate.candidate_id || 'N/A'}
          </span>
          <div className="flex items-center gap-2">
            {onBackToJob && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBackToJob}
                className="cursor-pointer gap-1.5 text-xs border-neutral-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to candidates</span>
              </Button>
            )}
            <Button
              size="sm"
              onClick={onClose}
              className="cursor-pointer text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
