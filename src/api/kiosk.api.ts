import axiosServices from 'utils/axios';
import type { Role } from 'store/slices/auth';

type KioskLoginRequest = {
  employee_code_or_email: string;
  pin: string;
};

/** POST /employee/kiosk/login (K1): the unlocking employee's own Role. */
export type KioskLoginResponse = {
  token: string;
  role: Role['role_type'];
  employee_id: string;
  display_name: string;
  /** GET /role/'s shape plus location_access. */
  kiosk_role: Role;
};

/** GET /employee/kiosk/session: the live session and its CURRENT grants. */
export type KioskSessionResponse = {
  employee_id: string;
  display_name: string;
  kiosk_role: Role;
};

/** 403 from kiosk login when the PIN is right but the employee has no Allyvia account. */
export const KIOSK_NO_ACCOUNT = 'kiosk_no_account';
/** 401 from any request whose X-Kiosk-Token no longer resolves (K2). */
export const KIOSK_SESSION_EXPIRED = 'kiosk_session_expired';

export async function kioskLogin(payload: KioskLoginRequest): Promise<KioskLoginResponse> {
  const { data } = await axiosServices.post('/employee/kiosk/login', payload);
  return data as KioskLoginResponse;
}

export async function getKioskSession(): Promise<KioskSessionResponse> {
  // X-Kiosk-Token is attached by the axios interceptor.
  const { data } = await axiosServices.get('/employee/kiosk/session');
  return data as KioskSessionResponse;
}

export async function kioskLock(token: string): Promise<{ status: string }> {
  const { data } = await axiosServices.post('/employee/kiosk/lock', { token });
  return data as { status: string };
}

export async function setEmployeePin(employeeId: string, pin: string, adminRoleId?: string): Promise<{ employee_id: string }> {
  const headers: Record<string, string> = {};
  if (adminRoleId) headers['X-Role-ID'] = adminRoleId;
  const { data } = await axiosServices.post('/employee/kiosk/set-pin', { employee_id: employeeId, pin }, { headers });
  return data as { employee_id: string };
}
