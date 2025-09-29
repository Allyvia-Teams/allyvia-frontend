import axiosServices from 'utils/axios';

type KioskLoginRequest = {
  employee_code_or_email: string;
  pin: string;
};

type KioskLoginResponse = {
  token: string;
  role: 'member';
  employee_id: string;
  display_name: string;
};

export async function kioskLogin(payload: KioskLoginRequest): Promise<KioskLoginResponse> {
  const { data } = await axiosServices.post('/employee/kiosk/login', payload);
  return data as KioskLoginResponse;
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
