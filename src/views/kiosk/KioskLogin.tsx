import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'store';
import { setKioskError, setKioskSession, setKioskStatus } from 'store/kioskSlice';
import { kioskLogin } from 'api/kiosk.api';

const padKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '↵'];

export default function KioskLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => identifier.trim().length > 0 && pin.length >= 4 && pin.length <= 6, [identifier, pin]);

  useEffect(() => {
    const preset = search.get('identifier');
    if (preset) setIdentifier(preset);
  }, [search]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    dispatch(setKioskStatus('loading'));
    setError(null);
    try {
      const res = await kioskLogin({ employee_code_or_email: identifier.trim(), pin });
      dispatch(
        setKioskSession({
          token: res.token,
          role: res.role,
          employeeId: res.employee_id,
          displayName: res.display_name
        })
      );
      navigate('/kiosk');
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || 'Unable to login. Please try again.';
      if (status === 429) {
        setError(detail);
      } else if (status === 401) {
        setError('Wrong PIN or identifier.');
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
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-4 text-center">Store Kiosk</h1>

        <label className="block text-sm font-medium mb-1">Employee Email or Code</label>
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="e.g. user@store.com"
          className="w-full border rounded px-3 py-2 mb-4"
        />

        <label className="block text-sm font-medium mb-1">PIN</label>
        <input
          value={pin.replace(/./g, '•')}
          readOnly
          placeholder="••••"
          className="w-full border rounded px-3 py-2 mb-4 text-center tracking-widest"
        />

        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

        <div className="grid grid-cols-3 gap-3 mb-4 select-none">
          {padKeys.map((k) => (
            <button key={k} onClick={() => handleKey(k)} className="py-4 text-xl rounded bg-gray-100 hover:bg-gray-200 active:bg-gray-300">
              {k}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-3 rounded text-white ${canSubmit ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
        >
          Login
        </button>
      </div>
    </div>
  );
}
