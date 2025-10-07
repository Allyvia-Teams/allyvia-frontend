import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'store';
import { clearKioskSession, hydrateKioskFromStorage } from 'store/kioskSlice';
import { kioskLock } from 'api/kiosk.api';

const IDLE_MIN = Number(import.meta.env.VITE_KIOSK_IDLE_MIN || 5);

export default function KioskShell() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const kiosk = useSelector((s) => s.kiosk);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    dispatch(hydrateKioskFromStorage());
  }, [dispatch]);

  // Auto lock after inactivity
  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(
        async () => {
          try {
            if (kiosk.token) await kioskLock(kiosk.token);
          } catch {}
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
      if (timerRef.current) window.clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [dispatch, navigate, kiosk.token]);

  const onLock = async () => {
    try {
      if (kiosk.token) await kioskLock(kiosk.token);
    } catch {}
    dispatch(clearKioskSession());
    navigate('/kiosk/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Kiosk</h1>
          <button onClick={onLock} className="px-4 py-2 bg-red-600 text-white rounded">
            Lock
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/kiosk/inventory')}
            className="h-28 rounded bg-indigo-50 hover:bg-indigo-100 text-xl font-medium"
          >
            Inventory
          </button>
          <button onClick={() => navigate('/kiosk/clock')} className="h-28 rounded bg-emerald-50 hover:bg-emerald-100 text-xl font-medium">
            Clock In / Out
          </button>
        </div>
      </div>
    </div>
  );
}
