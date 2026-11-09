import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Role } from 'store/slices/auth';

/**
 * A kiosk session: an employee unlocked the shared device with email + PIN.
 *
 * While it is active the app acts as the employee's OWN Role (the backend's
 * kiosk_role), never as the owner whose web session the device runs under --
 * see store/selectors/effectiveRole.ts.
 */
export type KioskSession = {
  token: string;
  /** The employee's own Role (kiosk_role from POST /employee/kiosk/login). */
  role: Role;
  employeeId: string;
  displayName: string;
  email?: string; // optional: identifier used to login (usually email)
};

type KioskState = {
  token: string | null;
  employeeId: string | null;
  displayName: string | null;
  email: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string | null;
};

export const KIOSK_SESSION_STORAGE_KEY = 'kioskSession';

const initialState: KioskState = {
  token: null,
  employeeId: null,
  displayName: null,
  email: null,
  role: null,
  isAuthenticated: false,
  status: 'idle',
  error: null
};

const isRole = (value: unknown): value is Role =>
  !!value && typeof value === 'object' && typeof (value as Role).id === 'string' && typeof (value as Role).role_type === 'string';

function persist(session: KioskSession) {
  try {
    localStorage.setItem(KIOSK_SESSION_STORAGE_KEY, JSON.stringify({ ...session, email: session.email || null }));
  } catch {}
}

function clearStored() {
  try {
    localStorage.removeItem(KIOSK_SESSION_STORAGE_KEY);
  } catch {}
}

const kioskSlice = createSlice({
  name: 'kiosk',
  initialState,
  reducers: {
    setKioskSession(state, action: PayloadAction<KioskSession>) {
      const { token, role, employeeId, displayName, email } = action.payload;
      state.token = token;
      state.role = role;
      state.employeeId = employeeId;
      state.displayName = displayName;
      state.email = email || null;
      state.isAuthenticated = true;
      state.status = 'succeeded';
      state.error = null;
      persist(action.payload);
      try {
        // persist a display name override for this employee so other views can use it
        const raw = localStorage.getItem('kioskNameOverrides');
        const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        map[employeeId] = displayName;
        localStorage.setItem('kioskNameOverrides', JSON.stringify(map));
        if (email) {
          const raw2 = localStorage.getItem('kioskNameByEmail');
          const map2 = raw2 ? (JSON.parse(raw2) as Record<string, string>) : {};
          map2[String(email).toLowerCase()] = displayName;
          localStorage.setItem('kioskNameByEmail', JSON.stringify(map2));
        }
      } catch {}
    },
    /** Fresh grants from GET /employee/kiosk/session (Settings → Team changes reach an unlocked kiosk). */
    setKioskRole(state, action: PayloadAction<Role>) {
      if (!state.isAuthenticated || !state.token) return;
      state.role = action.payload;
      persist({
        token: state.token,
        role: action.payload,
        employeeId: state.employeeId || '',
        displayName: state.displayName || '',
        email: state.email || undefined
      });
    },
    clearKioskSession(state) {
      state.token = null;
      state.role = null;
      state.employeeId = null;
      state.displayName = null;
      state.email = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
      clearStored();
    },
    setKioskStatus(state, action: PayloadAction<KioskState['status']>) {
      state.status = action.payload;
    },
    setKioskError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      if (action.payload) state.status = 'failed';
    },
    hydrateKioskFromStorage(state) {
      let parsed: Partial<KioskSession> | null = null;
      try {
        const raw = localStorage.getItem(KIOSK_SESSION_STORAGE_KEY);
        if (!raw) return;
        parsed = JSON.parse(raw) as Partial<KioskSession>;
      } catch {
        clearStored();
        return;
      }
      // A session stored before kiosk sessions carried the employee's Role
      // (role was the string 'member') cannot say what the employee may do:
      // drop it and ask for a fresh PIN.
      if (!parsed || !parsed.token || !isRole(parsed.role)) {
        clearStored();
        return;
      }
      state.token = parsed.token;
      state.role = parsed.role;
      state.employeeId = parsed.employeeId || null;
      state.displayName = parsed.displayName || null;
      state.email = parsed.email || null;
      state.isAuthenticated = true;
      state.status = 'succeeded';
    }
  }
});

export const { setKioskSession, setKioskRole, clearKioskSession, setKioskStatus, setKioskError, hydrateKioskFromStorage } =
  kioskSlice.actions;
export default kioskSlice.reducer;
