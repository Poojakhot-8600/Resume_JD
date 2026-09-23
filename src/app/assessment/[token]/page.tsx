'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { FileText, Loader2, CheckCircle2, ChevronLeft, ChevronRight, AlertTriangle, Clock } from 'lucide-react';

interface QuestionItem {
  id: string;
  question: string;
  topic: string;
}

export default function CandidateAssessmentPortal() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [isLoading, setIsLoading] = React.useState(true);
  const [errorState, setErrorState] = React.useState('');
  
  // Assessment info
  const [candidate, setCandidate] = React.useState<{
    id: string;
    name: string;
    email: string;
    status: 'INVITED' | 'SHORTLISTED' | 'SCHEDULED' | 'STARTED' | 'COMPLETED' | 'EVALUATED' | 'EXPIRED';
    jobTitle: string;
    slotStart: string | null;
    slotEnd: string | null;
    isWindowActive: boolean;
    isBeforeWindow: boolean;
    isAfterWindow: boolean;
  } | null>(null);

  const [questions, setQuestions] = React.useState<QuestionItem[]>([]);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  
  // Game states
  const [portalState, setPortalState] = React.useState<'welcome' | 'playing' | 'submitting' | 'success'>('welcome');
  const [activeQIndex, setActiveQIndex] = React.useState(0);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = React.useState(false);

  // Timer: 45 minutes
  const [timeLeft, setTimeLeft] = React.useState(2700);

  // Validate Token on Mount
  React.useEffect(() => {
    const validateToken = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/assessment/validate?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to validate assessment link.');
        }

        // Redirect to booking portal if candidate is shortlisted but hasn't booked yet
        if (data.candidate.status === 'SHORTLISTED') {
          router.push(`/candidate/book-slot/${token}`);
          return;
        }

        setCandidate(data.candidate);

        if (data.candidate.status === 'COMPLETED' || data.candidate.status === 'EVALUATED') {
          setPortalState('success');
        } else if (data.candidate.status === 'STARTED' && data.assessment) {
          setQuestions(data.assessment.questions);
          setAnswers(data.assessment.answers || {});
          setPortalState('playing');
        }
      } catch (err: any) {
        console.error('Validation error:', err);
        setErrorState(err.message || 'The assessment link is invalid or has expired.');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) validateToken();
  }, [token, router]);

  // Timer countdown hook
  React.useEffect(() => {
    if (portalState !== 'playing') return;

    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, portalState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Assessment
  const handleStart = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/assessment/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to generate assessment questions');

      setQuestions(data.assessment.questions);
      setAnswers({});
      setPortalState('playing');
    } catch (err: any) {
      alert(err.message || 'Error starting assessment.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Answer Changes
  const handleAnswerChange = (qId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: text }));
  };

  // Submit assessment logic
  const submitAnswers = async () => {
    setIsSubmitConfirmOpen(false);
    setPortalState('submitting');

    try {
      const res = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, answers }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Submission failed');
      }

      setPortalState('success');
    } catch (err: any) {
      alert(err.message || 'Error submitting assessment response. Please try again.');
      setPortalState('playing');
    }
  };

  const handleAutoSubmit = () => {
    console.log('[Timer Exhausted] Auto-submitting answers...');
    submitAnswers();
  };

  // Calculations
  const answeredCount = Object.values(answers).filter((a) => a.trim().length > 0).length;
  const progressPercentage = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4 space-y-4">
        <Loader2 className="h-8 w-8 text-neutral-900 animate-spin" />
        <span className="text-xs text-neutral-400 font-medium">Loading assessment configurations...</span>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4">
        <Card className="max-w-md w-full border-neutral-200">
          <CardHeader className="text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
            <CardTitle>Validation Failed</CardTitle>
            <CardDescription className="text-xs leading-relaxed text-red-800 bg-red-50 border border-red-100 p-3 rounded-sm">
              {errorState}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pt-2">
            <p className="text-xs text-neutral-400">
              If you believe this is an error, please reach out to the recruiter who invited you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Case 1: Candidate is INVITED but has not been shortlisted yet
  if (candidate && candidate.status === 'INVITED') {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-neutral-200 text-center p-6 shadow-sm">
          <Clock className="h-10 w-10 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-neutral-900">Application Under Review</h3>
          <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
            Hi <strong>{candidate.name}</strong>. Your profile is currently under review for the <strong>{candidate.jobTitle}</strong> position.
          </p>
          <p className="text-[10px] text-neutral-400 mt-4 border-t border-neutral-100 pt-3">
            Recruiting team will reach out once your profile has been updated to schedule your test window.
          </p>
        </Card>
      </div>
    );
  }

  // Case 2: Candidate is scheduled but before window
  if (candidate && candidate.status === 'SCHEDULED' && candidate.isBeforeWindow) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-neutral-200 text-center p-6 shadow-sm">
          <Clock className="h-10 w-10 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <h3 className="text-sm font-semibold text-neutral-900">Assessment Scheduled</h3>
          <p className="text-xs text-neutral-500 mt-2">
            Your assessment for the <strong>{candidate.jobTitle}</strong> position is scheduled.
          </p>
          <div className="bg-neutral-50 border p-3 rounded-sm my-4 text-xs font-semibold text-neutral-900 border-neutral-200">
            Opens At: {new Date(candidate.slotStart!).toLocaleString()}
          </div>
          <p className="text-[10px] text-neutral-400">
            Please return to this page during your scheduled window. The test will unlock automatically.
          </p>
        </Card>
      </div>
    );
  }

  // Case 3: Candidate has missed slot time window
  if (candidate && (candidate.status === 'EXPIRED' || (candidate.status === 'SCHEDULED' && candidate.isAfterWindow))) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-neutral-200 text-center p-6 shadow-sm">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-neutral-900">Assessment Window Closed</h3>
          <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
            Your scheduled assessment slot window has expired and closed.
          </p>
          <p className="text-[10px] text-neutral-400 mt-4 border-t border-neutral-100 pt-3">
            If you missed your scheduled window, please reach out to your recruitment contact.
          </p>
        </Card>
      </div>
    );
  }

  // Success Phase
  if (portalState === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4">
        <Card className="max-w-md w-full border-neutral-200 shadow-sm text-center">
          <CardHeader className="space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
            <CardTitle>Assessment Completed</CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Thank you! Your response for the <strong>{candidate?.jobTitle}</strong> position has been captured successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-neutral-600">
            <p className="leading-relaxed bg-neutral-50 p-4 rounded-sm border border-neutral-100">
              The recruitment team has been notified. Our evaluation pipeline will grade your responses, and a recruiter will get in touch with you shortly regarding the next steps.
            </p>
            <p className="text-[10px] text-neutral-400 pt-2">
              You may now safely close this browser window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Submitting Overlay
  if (portalState === 'submitting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4 space-y-4">
        <Loader2 className="h-8 w-8 text-neutral-900 animate-spin" />
        <div className="text-center space-y-1">
          <h3 className="text-sm font-semibold text-neutral-900">Submitting Answers...</h3>
          <p className="text-xs text-neutral-400 max-w-xs">
            Saving response details and triggering AI evaluation protocols. Please do not close this window.
          </p>
        </div>
      </div>
    );
  }

  // Welcome Screen Phase
  if (portalState === 'welcome' && candidate) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-xl w-full border-neutral-200 shadow-sm">
          <CardHeader className="border-b border-neutral-100">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-5 w-5 bg-neutral-900 flex items-center justify-center text-white text-[10px] font-bold rounded-sm">
                R
              </div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Recruitment Assessment
              </span>
            </div>
            <CardTitle className="text-lg">Technical Assessment: {candidate.jobTitle}</CardTitle>
            <CardDescription className="text-xs">
              Candidate: <span className="font-semibold text-neutral-950">{candidate.name}</span> ({candidate.email})
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5 text-xs text-neutral-700">
            <div className="space-y-2">
              <h4 className="font-semibold text-neutral-900 uppercase tracking-wider text-[10px]">
                Assessment Rules & Guidelines:
              </h4>
              <ul className="list-disc pl-4 space-y-2 leading-relaxed">
                <li>This test consists of AI-generated questions tailored from the Job Description.</li>
                <li>You will have <strong>45 minutes</strong> to complete and submit the test.</li>
                <li>Please do not refresh the page or navigate away once the timer begins.</li>
                <li>A countdown timer will be displayed. If the timer reaches zero, your progress will be automatically submitted.</li>
                <li>Write clear, detailed textual explanations. Typographical errors are not penalized.</li>
              </ul>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <Button size="md" className="cursor-pointer" onClick={handleStart}>
                Start Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam interface playing phase
  if (portalState === 'playing' && candidate && questions.length > 0) {
    const activeQ = questions[activeQIndex];
    const currentAnswer = answers[activeQ.id] || '';

    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col select-none">
        {/* Sticky Exam Header */}
        <header className="h-16 border-b border-neutral-200 bg-white sticky top-0 z-40 flex items-center justify-between px-6 md:px-12 select-none">
          <div className="space-y-0.5">
            <h1 className="text-xs font-bold text-neutral-900">{candidate.jobTitle} Assessment</h1>
            <p className="text-[10px] text-neutral-400 font-semibold truncate max-w-xs md:max-w-none">
              Candidate: {candidate.name}
            </p>
          </div>

          <div className="flex items-center gap-6">
            {/* Progress marker */}
            <div className="hidden md:flex flex-col items-end gap-1">
              <span className="text-[10px] text-neutral-500 font-semibold">
                Progress: {answeredCount} / {questions.length} Answered
              </span>
              <div className="h-1.5 w-32 bg-neutral-100 rounded-sm overflow-hidden border border-neutral-200/50">
                <div
                  className="h-full bg-neutral-900 transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Countdown timer */}
            <div className="flex items-center gap-2 border border-neutral-200 bg-neutral-50 px-3 py-1.5 rounded-sm">
              <Clock className="h-4 w-4 text-neutral-600" />
              <span className="font-mono text-xs font-bold text-neutral-900">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </header>

        {/* Portal split layouts */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left question navigation list */}
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-200 bg-white p-6 shrink-0 overflow-y-auto">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-4">
              Questions Navigator
            </h3>
            <div className="grid grid-cols-5 md:grid-cols-1 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = (answers[q.id] || '').trim().length > 0;
                const isActive = activeQIndex === idx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveQIndex(idx)}
                    className={`flex items-center justify-center md:justify-start gap-2.5 h-10 px-3 py-2 text-xs font-semibold border transition-all rounded-sm cursor-pointer select-none ${
                      isActive
                        ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs'
                        : isAnswered
                        ? 'border-neutral-200 bg-neutral-50/80 text-neutral-800'
                        : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="h-5 w-5 shrink-0 bg-neutral-100 text-neutral-800 text-[10px] flex items-center justify-center font-bold rounded-sm group-hover:bg-neutral-200">
                      {idx + 1}
                    </span>
                    <span className="hidden md:inline truncate">{q.topic}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main workspace text editor */}
          <main className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto min-w-0 bg-neutral-50/30">
            <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-between space-y-6">
              {/* Question display card */}
              <Card className="border-neutral-200">
                <CardHeader className="bg-neutral-50/60 py-4 border-b border-neutral-100">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">
                    Question {activeQIndex + 1} &bull; Topic: {activeQ.topic}
                  </span>
                  <CardTitle className="text-sm font-semibold text-neutral-900 leading-relaxed pt-0.5">
                    {activeQ.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  <Textarea
                    label="Your Response"
                    placeholder="Provide your technical answer here. Be as descriptive as possible..."
                    rows={12}
                    value={currentAnswer}
                    onChange={(e) => handleAnswerChange(activeQ.id, e.target.value)}
                    className="font-mono text-[13px] leading-relaxed"
                  />
                </CardContent>
              </Card>

              {/* Navigation controls */}
              <div className="flex items-center justify-between border-t border-neutral-200/60 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeQIndex === 0}
                  onClick={() => setActiveQIndex((p) => p - 1)}
                  className="cursor-pointer gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>

                {activeQIndex < questions.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={() => setActiveQIndex((p) => p + 1)}
                    className="cursor-pointer gap-1.5"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    className="cursor-pointer bg-neutral-950 hover:bg-neutral-900"
                    onClick={() => setIsSubmitConfirmOpen(true)}
                  >
                    Submit Assessment
                  </Button>
                )}
              </div>
            </div>
          </main>
        </div>

        {/* Submit Confirmation Dialog */}
        <Modal
          isOpen={isSubmitConfirmOpen}
          onClose={() => setIsSubmitConfirmOpen(false)}
          title="Submit Assessment?"
        >
          <div className="space-y-4 text-xs text-neutral-800">
            <p className="leading-relaxed">
              Are you sure you want to submit your final answers? You have completed{' '}
              <strong>
                {answeredCount} of {questions.length}
              </strong>{' '}
              questions.
            </p>
            <p className="text-red-700 bg-red-50 border border-red-100 p-3 rounded-sm leading-relaxed">
              <strong>Warning:</strong> You will not be able to change your answers or access the portal again after submission.
            </p>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" className="cursor-pointer" onClick={() => setIsSubmitConfirmOpen(false)}>
                Go Back
              </Button>
              <Button className="cursor-pointer bg-neutral-950 hover:bg-neutral-900" onClick={submitAnswers}>
                Confirm Submit
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return null;
}
