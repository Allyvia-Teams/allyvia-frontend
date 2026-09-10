// api/register.api.ts
//
// OS-side management of the iPads running Allyvia Register: the merchant half of
// the pairing handshake the device app walks the owner through.
//
// These are the /api/v1/register/ routes (register/admin_views.py), deliberately
// separate from the /api/register/ namespace the paired device itself uses — a
// device token must never manage devices. Every route needs the merchant JWT and
// an admin X-Role-ID; both are attached by utils/axios, so the paths here are
// relative and no company_id is ever passed explicitly.

import axiosServices from 'utils/axios';

const BASE_URL = '/register';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type RegisterDeviceStatus = 'pending' | 'active' | 'revoked';

export interface RegisterDeviceLocation {
  id: string;
  name: string;
}

export interface RegisterDevice {
  id: string;
  name: string;
  status: RegisterDeviceStatus;
  /** null means the device is not pinned to one location. */
  location: RegisterDeviceLocation | null;
  pairing_expires_at: string | null;
  paired_at: string | null;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string | null;
}

/**
 * The create and pairing-code responses, and only those. The code is minted and
 * returned exactly once — it is hashed server-side and never appears in the GET,
 * so it cannot be recovered from the device list after this response is dropped.
 */
export interface PairingCodeResponse extends RegisterDevice {
  pairing_code: string;
  pairing_code_ttl_seconds: number;
}

export interface CreateRegisterDevicePayload {
  name: string;
  /** Omitted for "Any location"; the key is only sent when one was chosen. */
  location_id?: string;
}

export interface UpdateRegisterDevicePayload {
  name?: string;
  /** null clears the location; undefined leaves it untouched. */
  location_id?: string | null;
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------
export const listRegisterDevices = async (): Promise<RegisterDevice[]> => {
  const { data } = await axiosServices.get<{ devices: RegisterDevice[] }>(`${BASE_URL}/devices/`);
  return data?.devices ?? [];
};

export const createRegisterDevice = async (payload: CreateRegisterDevicePayload): Promise<PairingCodeResponse> => {
  const body: Record<string, unknown> = { name: payload.name };
  // Sent only when a location was picked: an empty location_id is a 400 from
  // _resolve_location, where "Any location" is meant to be the absence of one.
  if (payload.location_id) {
    body.location_id = payload.location_id;
  }
  const { data } = await axiosServices.post<PairingCodeResponse>(`${BASE_URL}/devices/`, body);
  return data;
};

export const updateRegisterDevice = async (deviceId: string, payload: UpdateRegisterDevicePayload): Promise<RegisterDevice> => {
  const { data } = await axiosServices.patch<RegisterDevice>(`${BASE_URL}/devices/${deviceId}/`, payload);
  return data;
};

/**
 * Mints a fresh one-time code. On an ACTIVE device this is "re-pair": the row
 * returns to pending and the iPad holding the old tokens is signed out at its
 * next request. 409s on a revoked device — create a new one instead.
 */
export const reissuePairingCode = async (deviceId: string): Promise<PairingCodeResponse> => {
  const { data } = await axiosServices.post<PairingCodeResponse>(`${BASE_URL}/devices/${deviceId}/pairing-code/`);
  return data;
};

/** Idempotent: revoking an already-revoked device returns the row unchanged. */
export const revokeRegisterDevice = async (deviceId: string): Promise<RegisterDevice> => {
  const { data } = await axiosServices.post<RegisterDevice>(`${BASE_URL}/devices/${deviceId}/revoke/`);
  return data;
};

/** Tolerant display shape for statuses introduced by newer servers. */
export type RegisterDeviceRow = Omit<RegisterDevice, 'status'> & { status: string };
