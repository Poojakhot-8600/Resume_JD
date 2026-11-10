'use client';

import { logout, touchLastActivity, registerCancellationCallback } from './session';

// Global AbortController registry for active fetch calls
const activeControllers = new Set<AbortController>();

// Register global cancellation to abort in-flight requests on logout
if (typeof window !== 'undefined') {
  registerCancellationCallback(() => {
    activeControllers.forEach((controller) => {
      try {
        controller.abort();
      } catch {}
    });
    activeControllers.clear();
  });
}

/**
 * CENTRALIZED API FETCH WRAPPER (Requirement 6)
 * - Automatically sends credentials: 'include'
 * - Injects Authorization: Bearer <token> from localStorage fallback
 * - Intercepts 401 Unauthorized -> stops polling and calls logout('expired')
 * - Safely handles AbortError without treating it as an error or logout
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  activeControllers.add(controller);

  // If consumer provided an AbortSignal, connect it to our controller
  if (init?.signal) {
    if (init.signal.aborted) {
      activeControllers.delete(controller);
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    init.signal.addEventListener('abort', () => {
      controller.abort();
    });
  }

  // Inject Authorization header if auth_token exists in localStorage
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      token = localStorage.getItem('auth_token');
    } catch {}
  }

  const headers = new Headers(init?.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const finalInit: RequestInit = {
    ...init,
    headers,
    credentials: init?.credentials || 'include',
    signal: controller.signal,
  };

  try {
    const response = await fetch(input, finalInit);

    // Global 401 Interception (Requirement 6)
    if (response.status === 401) {
      // Don't trigger logout if the call itself was an auth endpoint (login/signup) failing
      const urlStr = typeof input === 'string' ? input : input.toString();
      if (!urlStr.includes('/api/auth/login') && !urlStr.includes('/api/auth/signup')) {
        console.warn('[apiClient] 401 Unauthorized received from', urlStr, '— triggering logout');
        await logout('expired');
      }
    } else if (response.ok) {
      // Touch activity timestamp on non-polling successful operations
      const urlStr = typeof input === 'string' ? input : input.toString();
      if (!urlStr.includes('/api/batches/')) {
        touchLastActivity();
      }
    }

    return response;
  } catch (err: any) {
    // If request was aborted by user navigation, component unmount, or logout,
    // do NOT treat as an error or trigger logout
    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      throw err;
    }
    throw err;
  } finally {
    activeControllers.delete(controller);
  }
}
