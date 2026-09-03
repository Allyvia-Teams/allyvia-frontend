import axiosServices from 'utils/axios';

// Allyvia Register device management. These routes are mounted at
// /api/v1/register/ -- INSIDE the axios baseURL -- so they take bare relative
// paths, unlike api/stripe.api.ts whose /api/stripe/ endpoints sit outside it.
//
// Every one of them is admin-gated server-side (register/admin_views.py
// _admin_company: a valid X-Role-ID whose role is_admin, else 403). The
// X-Role-ID and Authorization headers are attached centrally by utils/axios --
// nothing here touches headers, and nothing passes company_id, which the
// server derives from the role.
const BASE_URL = '/register/devices';

/** A paired (or pairing, or revoked) iPad. */
export interface RegisterDeviceRow {
  id: string;
  name: string;
  // 'pending' | 'active' | 'revoked' -- kept as string because the server
  // owns this vocabulary and a narrowed union here would make a new status a
  // compile error in the client rather than an unknown chip.
  status: string;
  location: { id: string; name: string } | null;
  // Set while a pairing code is outstanding; null once paired or expired.
  pairing_expires_at: string | null;
  paired_at: string | null;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

/**
 * A create or a code reissue: the row PLUS the one-time code.
 *
 * The code is returned by these two calls and NEVER by the list, because the
 * server stores only its HMAC. If it is lost, the only recovery is to reissue
 * -- which is why the UI must show it once, prominently, with the countdown.
 */
export interface RegisterDeviceWithCode extends RegisterDeviceRow {
  pairing_code: string;
  pairing_code_ttl_seconds: number;
}

export interface CreateDevicePayload {
  name: string;
  location_id?: string | null;
}

const registerApi = {
  listDevices: async (): Promise<RegisterDeviceRow[]> => {
    const response = await axiosServices.get<{ devices: RegisterDeviceRow[] }>(`${BASE_URL}/`);
    return response.data?.devices ?? [];
  },

  createDevice: async (payload: CreateDevicePayload): Promise<RegisterDeviceWithCode> => {
    const response = await axiosServices.post<RegisterDeviceWithCode>(`${BASE_URL}/`, payload);
    return response.data;
  },

  updateDevice: async (deviceId: string, payload: Partial<CreateDevicePayload>): Promise<RegisterDeviceRow> => {
    const response = await axiosServices.patch<RegisterDeviceRow>(`${BASE_URL}/${deviceId}/`, payload);
    return response.data;
  },

  /** Mint a fresh code for a device whose old one expired or was lost. 409 if revoked. */
  reissuePairingCode: async (deviceId: string): Promise<RegisterDeviceWithCode> => {
    const response = await axiosServices.post<RegisterDeviceWithCode>(`${BASE_URL}/${deviceId}/pairing-code/`, {});
    return response.data;
  },

  /** Terminal. The iPad's next request fails and it returns to the pairing screen. */
  revokeDevice: async (deviceId: string): Promise<RegisterDeviceRow> => {
    const response = await axiosServices.post<RegisterDeviceRow>(`${BASE_URL}/${deviceId}/revoke/`, {});
    return response.data;
  }
};

export default registerApi;
