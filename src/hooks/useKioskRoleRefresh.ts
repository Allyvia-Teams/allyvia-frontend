import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'store';
import { getKioskSession } from 'api/kiosk.api';
import { setKioskRole } from 'store/kioskSlice';
import { shouldRefreshKioskRole } from 'utils/kioskRefresh';

// Shared across every guard instance: one refresh per window, not per mount.
let lastRefreshAt = 0;

/**
 * Re-read the kiosk employee's Role from GET /employee/kiosk/session on window
 * focus and on route changes, at most once a minute, so grant changes made in
 * Settings → Team reach an unlocked kiosk without a fresh PIN. An expired
 * session answers 401 kiosk_session_expired, which the axios interceptor turns
 * into a lock.
 */
export function useKioskRoleRefresh() {
  const dispatch = useDispatch();
  const location = useLocation();
  const active = useSelector((s) => !!(s.kiosk.isAuthenticated && s.kiosk.token));

  const refresh = useCallback(async () => {
    const now = Date.now();
    if (!active || !shouldRefreshKioskRole(lastRefreshAt, now)) return;
    lastRefreshAt = now;
    try {
      const session = await getKioskSession();
      if (session?.kiosk_role) dispatch(setKioskRole(session.kiosk_role));
    } catch {
      // 401 kiosk_session_expired is handled by the axios interceptor.
    }
  }, [active, dispatch]);

  useEffect(() => {
    refresh();
  }, [location.pathname, refresh]);

  useEffect(() => {
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);
}
