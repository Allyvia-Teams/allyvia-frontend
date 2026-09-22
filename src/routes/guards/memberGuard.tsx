import React, { useEffect, useMemo, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'store';
import { clearKioskSession, hydrateKioskFromStorage } from 'store/kioskSlice';
import { kioskLock } from 'api/kiosk.api';
import type { ModulePermissions } from 'types/settings';

// The access rule itself lives in an axios-free module so it can be tested.
import { computeAllowedPrefixes, matchesAny } from './moduleAccess';

type Props = { children: React.ReactElement };

// Allowed kiosk paths (prefix match)
const ALLOWED_PREFIXES = ['/kiosk', '/kiosk/clock', '/kiosk/inventory'];

export default function MemberGuard({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const kiosk = useSelector((s) => s.kiosk);
  const roleType = useSelector((s) => s.auth.currentRole?.role_type);
  const modulePermissions = useSelector((s) => s.auth.currentRole?.module_permissions) as ModulePermissions | undefined;
  const userEmail = useSelector((s) => s.auth.user?.email) as string | undefined;
  const isLoggedIn = useSelector((s) => s.auth?.isLoggedIn);
  const isInitialized = useSelector((s) => s.auth?.isInitialized);
  const idleTimerRef = useRef<number | null>(null);
  const IDLE_MIN = Number(import.meta.env.VITE_KIOSK_IDLE_MIN || 5);

  // Detect existing kiosk session in localStorage so we persist across reloads
  const hasStoredKioskSession = useMemo(() => {
    try {
      return !!localStorage.getItem('kioskSession');
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (hasStoredKioskSession && !kiosk.isAuthenticated) {
      dispatch(hydrateKioskFromStorage());
    }
  }, [dispatch, hasStoredKioskSession, kiosk.isAuthenticated]);

  //fixed merge conflict
  // Auto-lock while in kiosk session (works across pages, no shell needed)
  useEffect(() => {
    if (!kiosk.isAuthenticated) return;

    const resetTimer = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(
        async () => {
          try {
            if (kiosk.token) await kioskLock(kiosk.token);
          } catch {}
          // Clear Redux + localStorage so the guard's auth checks actually lock out
          dispatch(clearKioskSession());
          navigate('/kiosk/login', { replace: true });
        },
        IDLE_MIN * 60 * 1000
      );
    };

    const events = ['click', 'keydown', 'touchstart', 'mousemove'];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [dispatch, kiosk.isAuthenticated, kiosk.token, navigate, IDLE_MIN]);

  // Don't render anything if not initialized or not logged in
  // Let AuthGuard handle the redirect to login
  if (!isInitialized || !isLoggedIn) {
    return null;
  }

  // If not kiosk-authenticated, force to kiosk login for any kiosk route (but avoid redirect loop on the login page itself)
  if (location.pathname.startsWith('/kiosk') && !kiosk.isAuthenticated) {
    if (location.pathname !== '/kiosk/login') {
      // If a session exists in storage, wait for hydration instead of redirecting
      if (!hasStoredKioskSession) {
        return <Navigate to="/kiosk/login" replace />;
      }
    }
  }

  const memberAllowedPrefixes = computeAllowedPrefixes(modulePermissions);

  // If kiosk-authenticated AND role is member, allow both kiosk routes AND regular member routes
  if (kiosk.isAuthenticated && (roleType || '').toLowerCase() === 'member') {
    const kioskAllowed = ALLOWED_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(p));
    const memberAllowed = matchesAny(location.pathname, memberAllowedPrefixes);

    // Allow both kiosk routes and regular member routes
    if (!kioskAllowed && !memberAllowed) {
      return <Navigate to="/kiosk/clock" replace />;
    }
  }

  // If user role is member (regular login), confine to their granted modules
  if ((roleType || '').toLowerCase() === 'member') {
    // Require kiosk PIN login first for members, but do not redirect if already on the kiosk login page
    if (!kiosk.isAuthenticated && location.pathname !== '/kiosk/login') {
      if (!hasStoredKioskSession) {
        const query = userEmail ? `?identifier=${encodeURIComponent(userEmail)}` : '';
        return <Navigate to={`/kiosk/login${query}`} replace />;
      }
    }
    const allowed = matchesAny(location.pathname, memberAllowedPrefixes);
    if (!allowed && !location.pathname.startsWith('/kiosk')) {
      // Default landing for members — Clock-in is always granted as a baseline.
      return <Navigate to="/employees/clock" replace />;
    }
  }

  return children;
}
