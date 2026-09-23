import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/database/db';
import { getCurrentUser } from '@/utils/auth';
import { serializeBigInt } from '@/utils/serialize';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mail, Phone, Briefcase, Award, ShieldCheck, Clock, CheckCircle } from 'lucide-react';
import DownloadReportButton from '@/components/candidates/DownloadReportButton';

interface Params {
  id: string;
}

export const revalidate = 0; // Dynamic server component

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return notFound();
  }

  const { id } = await params;

  // Retrieve candidate with job and assessment relationships
  const rawCandidate = await prisma.candidate.findFirst({
    where: { id },
    include: {
      job: true,
      assessments: true,
    },
  });

  if (!rawCandidate) {
    return notFound();
  }

  const candidate = serializeBigInt(rawCandidate);
  const assessment = candidate.assessments[0];
  const questions = (assessment?.questions as any[]) || [];
  const answers = (assessment?.answers as Record<string, string>) || {};
  const evalData = (assessment?.evaluationData as any) || {};
  const answersEval = evalData.answersEvaluation || {};
  const topicScores = evalData.topicScores || {};
  const skillScores = evalData.skillScores || {};
  const percentage = Math.round(assessment?.percentage || 0);

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'EVALUATED':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'COMPLETED':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'STARTED':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-neutral-50 border-neutral-200 text-neutral-800';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8">
      {/* Back link */}
      <div>
        <Link
          href="/dashboard/candidates"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">Back to Candidates</span>
        </Link>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/80 p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-32 w-32 bg-indigo-50/30 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 bg-indigo-600 text-white font-extrabold flex items-center justify-center rounded-xl shadow-sm">
              {candidate.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-neutral-900">{candidate.name}</h2>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusBg(
                    candidate.assessmentStatus
                  )}`}
                >
                  {candidate.assessmentStatus}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-neutral-500 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-neutral-400" />
                  {candidate.email}
                </span>
                {candidate.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-neutral-400" />
                    {candidate.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-neutral-400" />
                  {candidate.job?.title || candidate.currentJobTitle || 'Not Assigned'}
                </span>
              </div>
            </div>
          </div>

          {/* Action / Score Group */}
          {assessment && assessment.score !== null && (
            <div className="flex items-center gap-6">
              
              {/* Radial score progress */}
              <div className="relative flex items-center justify-center h-16 w-16">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    className="stroke-neutral-100"
                    strokeWidth="5"
                    fill="transparent"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    className="stroke-indigo-600"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 28}
                    strokeDashoffset={(2 * Math.PI * 28) * (1 - percentage / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-base font-extrabold text-neutral-900 leading-none">
                    {assessment.score}
                  </span>
                  <span className="text-[8px] font-bold text-neutral-400">/ 10</span>
                </div>
              </div>

              {/* Client Component Button for PDF download */}
              <DownloadReportButton candidate={candidate} assessment={assessment} />
            </div>
          )}
        </div>
      </div>

      {/* Assessment Status Check */}
      {candidate.assessmentStatus !== 'EVALUATED' && candidate.assessmentStatus !== 'COMPLETED' ? (
        <div className="py-16 bg-white border border-neutral-200/80 rounded-2xl text-center shadow-sm max-w-2xl mx-auto space-y-4 px-6">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-full inline-block">
            <Clock className="h-10 w-10" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-neutral-900">Assessment In Progress</h3>
            <p className="text-sm text-neutral-500">
              The candidate has not completed their assessment yet. Detailed scores, skills alignment, and full critiques will display immediately upon submission.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
              Invite Sent: {new Date(candidate.inviteSentAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Skill Ratings and Topics Breakdown */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Skill scores widget */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/80 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-neutral-500">Skills Alignment</h4>
              </div>
              <div className="p-6 space-y-4">
                {Object.keys(skillScores).length > 0 ? (
                  Object.entries(skillScores).map(([skill, val]) => (
                    <div key={skill} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-neutral-700">{skill}</span>
                        <span className="text-indigo-600 font-extrabold">{val as number}%</span>
                      </div>
                      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-400">Skill competencies not generated.</p>
                )}
              </div>
            </div>

            {/* Topic scores widget */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/80 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-neutral-500">Topic Analysis</h4>
              </div>
              <div className="p-6 space-y-3.5">
                {Object.keys(topicScores).length > 0 ? (
                  Object.entries(topicScores).map(([topic, val]) => (
                    <div key={topic} className="flex justify-between items-center text-xs pb-3 border-b border-neutral-100/50 last:border-0 last:pb-0">
                      <span className="text-neutral-700 font-semibold">{topic}</span>
                      <span className="font-extrabold text-neutral-900 bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-md text-[11px]">
                        {val as number} / 10
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-400">Topic scores not generated.</p>
                )}
              </div>
            </div>

          </div>

          {/* AI Overall Feedback & Question Detailed Breakdowns */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* AI Summary Feedback */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/80 overflow-hidden">
              <div className="px-6 py-4 bg-neutral-50/50 border-b border-neutral-100 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-neutral-500">Evaluation Critique</h4>
              </div>
              <div className="p-6 text-sm text-neutral-700 leading-relaxed font-normal whitespace-pre-line bg-gradient-to-b from-white to-neutral-50/30">
                {evalData.overallFeedback || 'No detailed overall critique provided.'}
              </div>
            </div>

            {/* Question Breakdown List */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider text-xs border-b border-neutral-100 pb-3">
                Detailed Responses & Scoring
              </h3>

              {questions.map((q, idx) => {
                const answer = answers[q.id] || 'Not answered.';
                const qEval = answersEval[q.id] || {};
                const qScore = qEval.score;
                const qFeedback = qEval.feedback;

                return (
                  <div key={q.id || idx} className="bg-white rounded-2xl shadow-sm border border-neutral-200/80 overflow-hidden">
                    <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-start gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">
                          Question {idx + 1} &bull; {q.topic}
                        </span>
                        <h4 className="text-sm font-bold text-neutral-950 leading-snug">
                          {q.question}
                        </h4>
                      </div>
                      {qScore !== undefined && (
                        <span className="shrink-0 text-xs font-extrabold text-neutral-900 border border-neutral-200 bg-white px-2.5 py-1 rounded-md shadow-xs">
                          {qScore} / 10
                        </span>
                      )}
                    </div>
                    
                    <div className="p-6 space-y-5">
                      {/* Candidate Answer */}
                      <div className="space-y-2">
                        <span className="font-extrabold text-neutral-400 uppercase tracking-wider text-[10px] block">
                          Submitted Answer
                        </span>
                        <div className="bg-neutral-50 border border-neutral-100/80 p-4 rounded-xl text-neutral-800 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                          {answer}
                        </div>
                      </div>

                      {/* AI Question Feedback */}
                      {qFeedback && (
                        <div className="space-y-2 pt-4 border-t border-neutral-100">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-indigo-600" />
                            <span className="font-extrabold text-neutral-400 uppercase tracking-wider text-[10px] block">
                              AI Explanation & Critique
                            </span>
                          </div>
                          <p className="text-sm text-neutral-700 leading-relaxed font-normal">{qFeedback}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
