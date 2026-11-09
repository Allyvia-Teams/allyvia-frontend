import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'store';
import { refreshRoles } from 'store/slices/auth';
import { shouldRefreshRoles } from 'utils/roleRefresh';

// Shared across every mount: one refresh per window, not per component.
let lastRefreshAt = 0;

/**
 * Re-read the signed-in account's roles on window focus, at most once a
 * minute, so grant changes made in Settings → Team reach an open tab without a
 * reload. refreshRoles re-points auth.currentRole at the refreshed object with
 * the same id.
 */
export function useRoleRefreshOnFocus() {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector((s) => !!s.auth.isLoggedIn);
  const kioskToken = useSelector((s) => s.kiosk.token);

  const refresh = useCallback(() => {
    const now = Date.now();
    if (!shouldRefreshRoles({ lastAt: lastRefreshAt, now, isLoggedIn, kioskToken })) return;
    lastRefreshAt = now;
    dispatch(refreshRoles());
  }, [dispatch, isLoggedIn, kioskToken]);

  useEffect(() => {
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);
}
