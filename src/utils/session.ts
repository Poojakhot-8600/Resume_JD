'use client';

// ==============================================================================
// SESSION & LOGOUT MANAGEMENT
// Single source of truth for logout, cross-tab broadcast, and active upload tracking
// ==============================================================================

const CHANNEL_NAME = 'appstrax_session_channel';
const LOGOUT_STORAGE_KEY = 'appstrax_logout_broadcast';
export const LAST_ACTIVITY_KEY = 'session_last_activity';
export const AUTH_TIME_KEY = 'session_auth_time';

// Registered callbacks to cancel in-flight operations on logout
const cancelCallbacks = new Set<() => void>();

// Set of currently active batch / upload IDs
const activeUploads = new Set<string>();

let broadcastChannel: BroadcastChannel | null = null;
let isLoggingOut = false;

// Initialize cross-tab communication
if (typeof window !== 'undefined') {
  try {
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'LOGOUT') {
          handleIncomingLogout(event.data.reason);
        }
      };
    }
  } catch (err) {
    console.warn('[Session] BroadcastChannel not supported, using storage event fallback');
  }

  // Storage event fallback for older browsers or cross-context
  window.addEventListener('storage', (event) => {
    if (event.key === LOGOUT_STORAGE_KEY && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        handleIncomingLogout(data.reason);
      } catch {
        handleIncomingLogout('expired');
      }
    }
  });
}

function handleIncomingLogout(reason?: string) {
  if (isLoggingOut) return;
  isLoggingOut = true;

  // Clean local keys
  cleanLocalSessionKeys();

  // Stop polling & abort requests
  stopAllActivePolling();

  const r = reason || 'expired';
  window.location.href = `/login?reason=${encodeURIComponent(r)}`;
}

/**
 * Remove only auth-related keys without touching unrelated user preferences
 */
export function cleanLocalSessionKeys() {
  if (typeof window === 'undefined') return;

  try {
    // 1. Target auth & session keys only
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(AUTH_TIME_KEY);
    localStorage.removeItem('active_candidate_upload_batch');
    localStorage.removeItem('active_jd_upload_batch');

    // 2. Clear sessionStorage completely (per requirement 2b)
    sessionStorage.clear();
  } catch (err) {
    console.error('[Session] Error cleaning session storage:', err);
  }
}

/**
 * Registers an active upload or batch processing ID.
 * Long-running uploads keep the session alive and prevent the idle warning dialog.
 */
export function registerActiveUpload(uploadId: string) {
  if (!uploadId) return;
  activeUploads.add(uploadId);
  touchLastActivity();
}

/**
 * Unregisters an upload or batch processing ID once completed or failed.
 */
export function unregisterActiveUpload(uploadId: string) {
  if (!uploadId) return;
  activeUploads.delete(uploadId);
  touchLastActivity();
}

/**
 * Returns true if any upload or batch polling is currently running.
 */
export function isAnyUploadActive(): boolean {
  return activeUploads.size > 0;
}

/**
 * Updates the last activity timestamp in localStorage (shared by all tabs).
 */
export function touchLastActivity() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch {}
}

/**
 * Registers a cancellation callback (e.g. aborting an AbortController or clearing a polling interval).
 */
export function registerCancellationCallback(cb: () => void): () => void {
  cancelCallbacks.add(cb);
  return () => {
    cancelCallbacks.delete(cb);
  };
}

/**
 * Stops all registered polling loops and aborts in-flight requests.
 */
export function stopAllActivePolling() {
  cancelCallbacks.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.warn('[Session] Error running cancellation callback:', err);
    }
  });
  activeUploads.clear();
}

/**
 * SINGLE CENTRALIZED LOGOUT FUNCTION (Requirement 2)
 * Used by logout buttons, idle timeout expiry, and 401 interceptors.
 *
 * @param reason 'timeout' | 'expired' | 'user'
 */
export async function logout(reason: 'timeout' | 'expired' | 'user' = 'user') {
  if (isLoggingOut) return;
  isLoggingOut = true;

  try {
    // 1. Call server POST /api/auth/logout to clear HTTP cookie (maxAge: 0)
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
  } catch {}

  // 2. Stop all polling and in-flight requests
  stopAllActivePolling();

  // 3. Clear auth keys in localStorage & sessionStorage
  cleanLocalSessionKeys();

  // 4. Broadcast logout to all other open tabs
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'LOGOUT', reason, timestamp: Date.now() });
    }
    localStorage.setItem(
      LOGOUT_STORAGE_KEY,
      JSON.stringify({ reason, timestamp: Date.now() })
    );
  } catch {}

  // 5. Redirect to /login with reason
  const reasonParam = reason === 'timeout' ? 'timeout' : reason === 'expired' ? 'expired' : 'logout';
  window.location.href = `/login?reason=${reasonParam}`;
}
