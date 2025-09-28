import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'store';
import { employeeAPI } from 'api/employee.api';
import { setKioskError, setKioskSession, setKioskStatus } from 'store/kioskSlice';
import { kioskLogin } from 'api/kiosk.api';

const padKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '↵'];

export default function KioskLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const authEmail = useSelector((s) => s.auth.user?.email) as string | undefined;
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [identifierLocked, setIdentifierLocked] = useState(false);
  const currentRole = useSelector((s) => s.auth.currentRole);

  const canSubmit = useMemo(() => identifier.trim().length > 0 && pin.length >= 4 && pin.length <= 6, [identifier, pin]);

  useEffect(() => {
    const preset = search.get('identifier');
    if (preset) {
      setIdentifier(preset);
      setIdentifierLocked(true);
    }
  }, [search]);

  // If user is logged in, default to their email and lock the identifier
  useEffect(() => {
    if (!identifierLocked && !identifier && authEmail) {
      setIdentifier(authEmail);
      setIdentifierLocked(true);
    }
  }, [authEmail, identifier, identifierLocked]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    dispatch(setKioskStatus('loading'));
    setError(null);
    try {
      console.log('[KIOSK] Attempt login', { identifier: identifier.trim(), pin, pinLength: pin.length });
      // Debug: check if employee exists and has a saved kiosk PIN
      try {
        const identifierTrimmed = identifier.trim();
        const companyId = currentRole?.company_id as string | undefined;
        if (companyId) {
          const list = await employeeAPI.getEmployees(companyId, identifierTrimmed);
          const exact = list.find((e) => e.email?.toLowerCase() === identifierTrimmed.toLowerCase());
          console.log('[KIOSK] Debug lookup', {
            identifier: identifierTrimmed,
            matchesReturned: list.length,
            exactMatch: !!exact,
            employeeId: exact?.id,
            has_kiosk_pin: exact?.has_kiosk_pin
          });
        } else {
          console.warn('[KIOSK] No company_id available to verify employee before login');
        }
      } catch (lookupErr) {
        console.warn('[KIOSK] Employee lookup failed', lookupErr);
      }

      const res = await kioskLogin({ employee_code_or_email: identifier.trim(), pin });
      dispatch(
        setKioskSession({
          token: res.token,
          role: res.role,
          employeeId: res.employee_id,
          displayName: res.display_name
        })
      );
      // After successful PIN unlock, take the employee straight to their clock page
      navigate('/kiosk/clock');
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || 'Unable to login. Please try again.';
      if (status === 429) {
        setError(detail);
      } else if (status === 401) {
        setError(identifierLocked ? 'Wrong PIN.' : 'Wrong PIN or identifier.');
      } else {
        setError(detail);
      }
      dispatch(setKioskError(detail));
      dispatch(setKioskStatus('failed'));
    }
  };

  const handleKey = (k: string) => {
    if (k === '⌫') {
      setPin((p) => p.slice(0, -1));
    } else if (k === '↵') {
      handleSubmit();
    } else if (/^[0-9]$/.test(k)) {
      setPin((p) => (p.length < 6 ? p + k : p));
    }
  };

  return (
    <div style={{ minHeight: '100vh' }} className="flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-3xl font-semibold mb-2 text-center">Store Kiosk</h1>
        <p className="text-center text-gray-500 mb-6">Enter your PIN to continue</p>

        {identifierLocked ? (
          <div className="mb-4">
            <div className="text-xs uppercase text-gray-400 mb-1">Employee</div>
            <div className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700 truncate">{identifier}</div>
            <button
              type="button"
              onClick={() => {
                setIdentifierLocked(false);
                setPin('');
                setError(null);
              }}
              className="mt-2 text-xs text-indigo-600 hover:underline"
            >
              Use a different employee
            </button>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Employee Email or Code</label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. user@store.com"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        )}

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">PIN</label>
          <input
            value={pin.replace(/./g, '•')}
            readOnly
            placeholder="••••"
            className="w-full border rounded px-3 py-3 mb-2 text-center tracking-[0.6em] text-xl"
          />
        </div>

        {error && <div className="text-red-600 text-sm mb-3 text-center">{error}</div>}

        <div className="grid grid-cols-3 gap-3 mb-4 select-none">
          {padKeys.map((k) => (
            <button
              key={k}
              onClick={() => handleKey(k)}
              className="py-5 text-2xl rounded-lg bg-gray-100 hover:bg-gray-200 active:bg-gray-300"
            >
              {k}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 rounded-lg text-white ${canSubmit ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          {identifierLocked ? 'Unlock' : 'Login'}
        </button>
      </div>
    </div>
  );
}
