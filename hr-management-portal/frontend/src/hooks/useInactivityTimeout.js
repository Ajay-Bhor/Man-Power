import { useEffect, useRef, useCallback } from 'react';

export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes = 300,000 milliseconds
export const LAST_ACTIVITY_KEY = 'ats_last_activity';
export const SESSION_EVENT_KEY = 'ats_session_event';

/**
 * useInactivityTimeout hook
 * Manages secure automatic inactivity logout across all browser tabs.
 *
 * @param {boolean} isAuthenticated - Whether the user is currently authenticated
 * @param {Function} onTimeout - Callback invoked when 5 minutes of inactivity is reached
 * @param {Function} onRemoteLogout - Callback invoked when another tab triggers logout
 */
export default function useInactivityTimeout(isAuthenticated, onTimeout, onRemoteLogout) {
  const lastRecordTimeRef = useRef(Date.now());
  const onTimeoutRef = useRef(onTimeout);
  const onRemoteLogoutRef = useRef(onRemoteLogout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
    onRemoteLogoutRef.current = onRemoteLogout;
  }, [onTimeout, onRemoteLogout]);

  // Record user activity in localStorage to synchronize across tabs
  const recordActivity = useCallback(() => {
    const now = Date.now();
    // Throttle localStorage writes to once every 1 second
    if (now - lastRecordTimeRef.current >= 1000) {
      lastRecordTimeRef.current = now;
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
      } catch (e) {
        // Handle storage quota or private browsing exceptions
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Initialize activity timestamp upon active authentication
    const initialTime = Date.now();
    lastRecordTimeRef.current = initialTime;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, initialTime.toString());
    } catch (e) {}

    // Events to monitor user interaction
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => {
      recordActivity();
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    // Cross-tab synchronization via storage event
    const handleStorageChange = (e) => {
      if (e.key === SESSION_EVENT_KEY && e.newValue) {
        try {
          const event = JSON.parse(e.newValue);
          if (event.type === 'INACTIVITY_LOGOUT') {
            if (onTimeoutRef.current) onTimeoutRef.current(true); // remote triggered
          } else if (event.type === 'MANUAL_LOGOUT') {
            if (onRemoteLogoutRef.current) onRemoteLogoutRef.current();
          }
        } catch (err) {}
      } else if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        // User was active in another tab, update local ref
        const remoteTime = Number(e.newValue);
        if (remoteTime > lastRecordTimeRef.current) {
          lastRecordTimeRef.current = remoteTime;
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Heartbeat check interval running every 1,000 ms (1 second)
    const checkInterval = setInterval(() => {
      try {
        const storedLastStr = localStorage.getItem(LAST_ACTIVITY_KEY);
        const last = storedLastStr ? Number(storedLastStr) : lastRecordTimeRef.current;
        const elapsed = Date.now() - last;

        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          // Broadcast expiration to other tabs
          try {
            localStorage.setItem(SESSION_EVENT_KEY, JSON.stringify({
              type: 'INACTIVITY_LOGOUT',
              timestamp: Date.now()
            }));
          } catch (e) {}

          if (onTimeoutRef.current) {
            onTimeoutRef.current(false);
          }
        }
      } catch (err) {
        console.error('Error checking inactivity interval:', err);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkInterval);
    };
  }, [isAuthenticated, recordActivity]);
}
