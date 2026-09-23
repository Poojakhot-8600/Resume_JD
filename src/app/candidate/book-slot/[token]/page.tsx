'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, CheckCircle2, AlertTriangle, Clock, ArrowRight } from 'lucide-react';

interface SlotItem {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  status: string;
}

export default function CandidateBookSlotPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorState, setErrorState] = React.useState('');

  const [candidate, setCandidate] = React.useState<{
    id: string;
    name: string;
    email: string;
    status: 'INVITED' | 'SHORTLISTED' | 'SCHEDULED' | 'STARTED' | 'COMPLETED' | 'EVALUATED' | 'EXPIRED';
    jobTitle: string;
    slotStart: string | null;
    slotEnd: string | null;
  } | null>(null);

  const [slots, setSlots] = React.useState<SlotItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = React.useState<string | null>(null);
  const [bookedSlot, setBookedSlot] = React.useState<{ startTime: string; endTime: string } | null>(null);

  // Validate Candidate and Load Slots
  const initializePage = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorState('');

      // 1. Validate Token
      const resVal = await fetch(`/api/assessment/validate?token=${token}`);
      const dataVal = await resVal.json();

      if (!resVal.ok) {
        throw new Error(dataVal.error || 'Failed to validate assessment link.');
      }

      setCandidate(dataVal.candidate);

      // Save booked details if already scheduled
      if (dataVal.candidate.status === 'SCHEDULED' && dataVal.candidate.slotStart) {
        setBookedSlot({
          startTime: dataVal.candidate.slotStart,
          endTime: dataVal.candidate.slotEnd!,
        });
      }

      // 2. Load Slots if candidate is eligible to book
      if (dataVal.candidate.status === 'SHORTLISTED') {
        const resSlots = await fetch('/api/slots');
        const dataSlots = await resSlots.json();
        if (dataSlots.slots) {
          // Filter only active, non-full, future slots
          const now = new Date();
          const availableSlots = dataSlots.slots.filter((s: SlotItem) => {
            const isFuture = new Date(s.endTime) > now;
            const isAvailable = s.bookedCount < s.capacity;
            const isActive = s.status === 'ACTIVE';
            return isFuture && isAvailable && isActive;
          });
          setSlots(availableSlots);
        }
      }
    } catch (err: any) {
      console.error('Initialization error:', err);
      setErrorState(err.message || 'Error loading page.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (token) initializePage();
  }, [token, initializePage]);

  // Handle slot reservation POST
  const handleBookSlot = async () => {
    if (!selectedSlotId) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/assessment/book-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, slotId: selectedSlotId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Booking reservation failed.');
      }

      // Update screen state
      setBookedSlot({
        startTime: slots.find((s) => s.id === selectedSlotId)!.startTime,
        endTime: slots.find((s) => s.id === selectedSlotId)!.endTime,
      });
      setCandidate((prev) => prev ? { ...prev, status: 'SCHEDULED' } : null);
    } catch (err: any) {
      alert(err.message || 'Error booking slot. Please select a different slot.');
      initializePage(); // Reload list
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSlotTime = (timeStr: string) => {
    const d = new Date(timeStr);
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4 space-y-4">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <span className="text-xs text-neutral-400 font-medium">Verifying invitation tokens...</span>
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
              Please contact the recruiter who shortlisted you if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Case 1: Candidate is already SCHEDULED
  if (candidate?.status === 'SCHEDULED' && bookedSlot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4">
        <Card className="max-w-md w-full border-neutral-200 shadow-sm text-center">
          <CardHeader className="space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
            <CardTitle>Assessment Slot Scheduled</CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Your assessment slot for the <strong>{candidate.jobTitle}</strong> position is confirmed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-sm text-xs space-y-2 text-left">
              <div className="flex items-center justify-between text-neutral-600">
                <span>Start Time:</span>
                <span className="font-bold text-neutral-900">{formatSlotTime(bookedSlot.startTime)}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-600">
                <span>End Time:</span>
                <span className="font-bold text-neutral-900">{formatSlotTime(bookedSlot.endTime)}</span>
              </div>
            </div>
            <p className="text-xs text-neutral-500 text-left">
              You will be able to access the assessment questions during this scheduled slot window. Please keep this portal URL bookmarked.
            </p>
            <Button
              className="w-full cursor-pointer gap-2 mt-4 bg-indigo-600 hover:bg-indigo-500 text-white"
              onClick={() => router.push(`/assessment/${token}`)}
            >
              <span>Go to Assessment Page</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Case 2: Candidate is INVITED but not yet SHORTLISTED
  if (candidate?.status === 'INVITED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4">
        <Card className="max-w-md w-full border-neutral-200 shadow-sm text-center">
          <CardHeader className="space-y-3">
            <Clock className="h-10 w-10 text-neutral-400 mx-auto" />
            <CardTitle>Application Under Review</CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Hi {candidate.name}. Your profile is currently under review for the <strong>{candidate.jobTitle}</strong> position.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-neutral-400 leading-relaxed">
            Once you are shortlisted for the assessment phase, you will receive an email invitation to schedule your test window.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Case 3: Candidate has already completed the assessment
  if (candidate?.status === 'COMPLETED' || candidate?.status === 'EVALUATED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4">
        <Card className="max-w-md w-full border-neutral-200 shadow-sm text-center">
          <CardHeader className="space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
            <CardTitle>Assessment Completed</CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              You have already completed the technical assessment for <strong>{candidate?.jobTitle}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-neutral-400">
            No further actions are required. The hiring team is evaluating your responses.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Case 4: Candidate is SHORTLISTED (needs to book slot)
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <Card className="max-w-lg w-full border-neutral-200 shadow-sm">
        <CardHeader className="border-b border-neutral-100 pb-5">
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="h-4 w-4" />
            <span>Shortlisted candidate</span>
          </div>
          <CardTitle className="text-lg">Schedule Your Assessment Window</CardTitle>
          <CardDescription className="text-xs">
            Hello {candidate?.name}. Please select one of the available assessment slots below to complete your evaluation for <strong>{candidate?.jobTitle}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {slots.length === 0 ? (
            <div className="text-center py-8 space-y-2 text-neutral-500 text-xs font-medium bg-neutral-50 border border-dashed border-neutral-200 rounded-sm">
              <span>No scheduling slots are currently available.</span>
              <p className="text-[10px] text-neutral-400 max-w-xs mx-auto">
                The hiring team will add slot availability shortly. Please check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
              {slots.map((s) => {
                const isSelected = selectedSlotId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSlotId(s.id)}
                    className={`p-3.5 border rounded-sm cursor-pointer select-none transition-all flex items-center justify-between text-xs font-medium ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-xs'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="font-semibold block">
                        {formatSlotTime(s.startTime)}
                      </span>
                      <span className="text-[10px] text-neutral-400 block font-normal">
                        Duration: 2 hours (Closes at {new Date(s.endTime).toLocaleTimeString()})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] bg-neutral-100 text-neutral-600 border px-2 py-0.5 rounded-sm">
                        {s.capacity - s.bookedCount} spots left
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-4">
            <span className="text-[10px] text-neutral-400 leading-relaxed max-w-[65%]">
              * Note: The test timer runs for 45 minutes, but you must complete your submission within your booked slot.
            </span>
            <Button
              onClick={handleBookSlot}
              disabled={!selectedSlotId || isSubmitting}
              className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-sm"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Reserving...</span>
                </div>
              ) : (
                'Confirm Booking'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
