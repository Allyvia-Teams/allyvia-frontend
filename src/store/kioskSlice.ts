import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type KioskSession = {
  token: string;
  role: 'member';
  employeeId: string;
  displayName: string;
};

type KioskState = {
  token: string | null;
  employeeId: string | null;
  displayName: string | null;
  role: 'member' | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string | null;
};

const initialState: KioskState = {
  token: null,
  employeeId: null,
  displayName: null,
  role: null,
  isAuthenticated: false,
  status: 'idle',
  error: null
};

const kioskSlice = createSlice({
  name: 'kiosk',
  initialState,
  reducers: {
    setKioskSession(state, action: PayloadAction<KioskSession>) {
      const { token, role, employeeId, displayName } = action.payload;
      state.token = token;
      state.role = role;
      state.employeeId = employeeId;
      state.displayName = displayName;
      state.isAuthenticated = true;
      state.status = 'succeeded';
      state.error = null;
      // persist minimal session
      try {
        localStorage.setItem('kioskSession', JSON.stringify({ token, role, employeeId, displayName }));
      } catch {}
    },
    clearKioskSession(state) {
      state.token = null;
      state.role = null;
      state.employeeId = null;
      state.displayName = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
      try {
        localStorage.removeItem('kioskSession');
      } catch {}
    },
    setKioskStatus(state, action: PayloadAction<KioskState['status']>) {
      state.status = action.payload;
    },
    setKioskError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      if (action.payload) state.status = 'failed';
    },
    hydrateKioskFromStorage(state) {
      try {
        const raw = localStorage.getItem('kioskSession');
        if (!raw) return;
        const parsed = JSON.parse(raw) as KioskSession;
        state.token = parsed.token;
        state.role = parsed.role;
        state.employeeId = parsed.employeeId;
        state.displayName = parsed.displayName;
        state.isAuthenticated = true;
        state.status = 'succeeded';
      } catch {}
    }
  }
});

export const { setKioskSession, clearKioskSession, setKioskStatus, setKioskError, hydrateKioskFromStorage } = kioskSlice.actions;
export default kioskSlice.reducer;
