'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  logout,
  touchLastActivity,
  isAnyUploadActive,
  LAST_ACTIVITY_KEY,
  AUTH_TIME_KEY,
} from '@/utils/session';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

// Read client environment variables with fallbacks
const IDLE_TIMEOUT_MINUTES = parseInt(
  process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES || '20',
  10
);
const WARNING_SECONDS = parseInt(
  process.env.NEXT_PUBLIC_SESSION_WARNING_SECONDS || '60',
  10
);
// Max hours from server or 8
const MAX_HOURS = 8;

export function SessionTimeoutManager() {
  const pathname = usePathname();

  // Public routes where idle timer must not run
  const isPublicRoute =
    !pathname ||
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/assessment') ||
    pathname.startsWith('/candidate');

  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_SECONDS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastActivityThrottledRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Throttled user activity handler (at most once every 1000ms)
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastActivityThrottledRef.current >= 1000) {
      lastActivityThrottledRef.current = now;
      touchLastActivity();
    }
  }, []);

  // "Stay signed in" action: calls /api/auth/refresh to renew sliding cookie and resets timer
  const handleStaySignedIn = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        // Refresh failed (e.g. absolute max hours exceeded)
        await logout('expired');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (data?.token) {
        try {
          localStorage.setItem('auth_token', data.token);
        } catch {}
      }

      // Reset activity and hide modal
      touchLastActivity();
      setShowWarning(false);
      setSecondsRemaining(WARNING_SECONDS);
    } catch (err) {
      console.error('[SessionTimeout] Failed to refresh session:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualLogout = () => {
    logout('user');
  };

  useEffect(() => {
    if (isPublicRoute) return;

    // Ensure session timestamps exist in localStorage
    const now = Date.now();
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    }
    if (!localStorage.getItem(AUTH_TIME_KEY)) {
      localStorage.setItem(AUTH_TIME_KEY, now.toString());
    }

    // Attach activity listeners
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Check timer every second based on timestamps (accurate across tab sleep / laptop closed)
    intervalRef.current = setInterval(() => {
      const currentTime = Date.now();

      // 1. Check absolute max hours limit (SESSION_MAX_HOURS)
      const authTime = parseInt(localStorage.getItem(AUTH_TIME_KEY) || `${currentTime}`, 10);
      const maxHoursMs = MAX_HOURS * 3600 * 1000;
      if (currentTime - authTime >= maxHoursMs) {
        console.warn('[SessionTimeout] Absolute max hours reached — logging out');
        logout('expired');
        return;
      }

      // 2. If long uploads or batch polling is active, touch activity and do not show modal
      if (isAnyUploadActive()) {
        touchLastActivity();
        setShowWarning(false);
        return;
      }

      // 3. Calculate idle time remaining
      const lastActivity = parseInt(
        localStorage.getItem(LAST_ACTIVITY_KEY) || `${currentTime}`,
        10
      );
      const idleTimeoutMs = IDLE_TIMEOUT_MINUTES * 60 * 1000;
      const elapsed = currentTime - lastActivity;
      const remainingMs = idleTimeoutMs - elapsed;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      // 4. Hard expiry at 0 seconds remaining
      if (remainingSec <= 0) {
        console.warn('[SessionTimeout] 20-minute idle limit reached — logging out');
        logout('timeout');
        return;
      }

      // 5. Show warning modal when within WARNING_SECONDS
      if (remainingSec <= WARNING_SECONDS) {
        setShowWarning(true);
        setSecondsRemaining(remainingSec);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPublicRoute, handleUserActivity]);

  if (isPublicRoute || !showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 p-6 space-y-5 text-neutral-900 select-none">
        {/* Header Icon & Title */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              Session Expiring Soon
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              You have been inactive for a while. For your security, you will be signed out automatically.
            </p>
          </div>
        </div>

        {/* Countdown Box */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-center space-y-1">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Time Remaining
          </span>
          <div className="text-3xl font-extrabold font-mono text-amber-600 tracking-tight">
            {secondsRemaining}s
          </div>
          <p className="text-[11px] text-neutral-400">
            Your session will expire in {secondsRemaining} seconds unless you stay signed in.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleManualLogout}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>

          <button
            type="button"
            onClick={handleStaySignedIn}
            disabled={isRefreshing}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isRefreshing ? 'Renewing...' : 'Stay signed in'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
