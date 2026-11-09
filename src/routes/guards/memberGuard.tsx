import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'store';
import { clearKioskSession, hydrateKioskFromStorage } from 'store/kioskSlice';
import { kioskLock } from 'api/kiosk.api';
import { selectEffectiveModulePermissions, selectEffectiveRoleType } from 'store/selectors/effectiveRole';
import { isKioskDevice, markKioskDevice } from 'utils/kioskDevice';
import { useKioskRoleRefresh } from 'hooks/useKioskRoleRefresh';

// The access rule itself lives in an axios-free module so it can be tested.
import { guardRedirect } from './moduleAccess';

type Props = { children: React.ReactElement };

export default function MemberGuard({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const kiosk = useSelector((s) => s.kiosk);
  // The kiosk employee's role while a kiosk session is active, else the signed-in role.
  const roleType = useSelector(selectEffectiveRoleType);
  const modulePermissions = useSelector(selectEffectiveModulePermissions);
  const userEmail = useSelector((s) => s.auth.user?.email) as string | undefined;
  const isLoggedIn = useSelector((s) => s.auth?.isLoggedIn);
  const isInitialized = useSelector((s) => s.auth?.isInitialized);
  const idleTimerRef = useRef<number | null>(null);
  const IDLE_MIN = Number(import.meta.env.VITE_KIOSK_IDLE_MIN || 5);

  // Restore a kiosk session from localStorage BEFORE deciding anything. Until
  // then nothing renders: a stored session that hydration rejects (stored
  // before sessions carried a Role) must never leave the owner's pages
  // showing on a kiosk while we wait.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!kiosk.isAuthenticated) dispatch(hydrateKioskFromStorage());
    setHydrated(true);
    // Hydrate once per mount.
  }, []);

  // Entering any kiosk route marks this browser as the shared kiosk.
  useEffect(() => {
    if (location.pathname.startsWith('/kiosk')) markKioskDevice();
  }, [location.pathname]);

  // Keep the kiosk role's grants fresh (focus / route change, at most once a minute).
  useKioskRoleRefresh();

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
  if (!isInitialized || !isLoggedIn || !hydrated) {
    return null;
  }

  const redirect = guardRedirect({
    pathname: location.pathname,
    effectiveRoleType: roleType,
    modulePermissions,
    kioskActive: !!(kiosk.isAuthenticated && kiosk.role),
    // Read on every render: Exit kiosk mode clears it mid-session.
    kioskDevice: isKioskDevice() || location.pathname.startsWith('/kiosk'),
    userEmail
  });
  if (redirect && redirect.split('?')[0] !== location.pathname) {
    return <Navigate to={redirect} replace />;
  }

  return children;
}
