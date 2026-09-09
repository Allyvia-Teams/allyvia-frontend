import { beforeEach, describe, expect, it, vi } from 'vitest';

// utils/axios cannot be imported under vitest's node environment — it pulls in
// utils/mockApi.ts, which reads localStorage at module load. Mocking the module
// outright is the repo's established pattern (see agent.api.test.ts) and it is
// what lets the transport layer itself be tested rather than a payload builder.
const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();

vi.mock('utils/axios', () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args)
  }
}));

import { createRegisterDevice, listRegisterDevices, reissuePairingCode, revokeRegisterDevice, updateRegisterDevice } from './register.api';

const DEVICE = {
  id: 'dev-1',
  name: 'Front till',
  status: 'pending' as const,
  location: null,
  pairing_expires_at: null,
  paired_at: null,
  last_seen_at: null,
  revoked_at: null,
  created_at: '2026-09-09T10:00:00Z'
};

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  get.mockResolvedValue({ data: { devices: [] } });
  post.mockResolvedValue({ data: { ...DEVICE, pairing_code: 'ABCD2345', pairing_code_ttl_seconds: 900 } });
  patch.mockResolvedValue({ data: DEVICE });
});

describe('listRegisterDevices', () => {
  it('gets the device collection and unwraps the devices envelope', async () => {
    get.mockResolvedValue({ data: { devices: [DEVICE] } });

    const devices = await listRegisterDevices();

    expect(get.mock.calls[0][0]).toBe('/register/devices/');
    expect(devices).toEqual([DEVICE]);
  });

  it('returns an empty list rather than undefined when the envelope is missing', async () => {
    // A caller that maps over the result must not crash on an unexpected body.
    get.mockResolvedValue({ data: {} });

    await expect(listRegisterDevices()).resolves.toEqual([]);
  });
});

describe('createRegisterDevice', () => {
  it('posts the name and location to the device collection', async () => {
    await createRegisterDevice({ name: 'Front till', location_id: 'loc-1' });

    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/register/devices/');
    expect(body).toEqual({ name: 'Front till', location_id: 'loc-1' });
  });

  it('omits location_id entirely when no location was chosen', async () => {
    // "Any location" is the absence of the key, not a null: the backend reads
    // request.data.get('location_id') and resolves '' / None to no location,
    // but sending the key at all makes an accidental blank a location error.
    await createRegisterDevice({ name: 'Back till' });

    const body = post.mock.calls[0][1] as Record<string, unknown>;
    expect(body).toEqual({ name: 'Back till' });
    expect('location_id' in body).toBe(false);
  });

  it('returns the one-time pairing code from the create response', async () => {
    const created = await createRegisterDevice({ name: 'Front till' });

    expect(created.pairing_code).toBe('ABCD2345');
    expect(created.pairing_code_ttl_seconds).toBe(900);
  });
});

describe('updateRegisterDevice', () => {
  it('patches the device detail route', async () => {
    await updateRegisterDevice('dev-1', { name: 'Renamed till' });

    const [url, body] = patch.mock.calls[0];
    expect(url).toBe('/register/devices/dev-1/');
    expect(body).toEqual({ name: 'Renamed till' });
  });

  it('sends a null location_id to clear the location', async () => {
    // Clearing is a real edit: _resolve_location treats None as "no location",
    // so the key has to be present for "Any location" to be saved.
    await updateRegisterDevice('dev-1', { location_id: null });

    expect(patch.mock.calls[0][1]).toEqual({ location_id: null });
  });
});

describe('reissuePairingCode', () => {
  it('posts to the pairing-code route for the device', async () => {
    const result = await reissuePairingCode('dev-1');

    expect(post.mock.calls[0][0]).toBe('/register/devices/dev-1/pairing-code/');
    expect(result.pairing_code).toBe('ABCD2345');
  });
});

describe('revokeRegisterDevice', () => {
  it('posts to the revoke route for the device', async () => {
    post.mockResolvedValue({ data: { ...DEVICE, status: 'revoked' } });

    const device = await revokeRegisterDevice('dev-1');

    expect(post.mock.calls[0][0]).toBe('/register/devices/dev-1/revoke/');
    expect(device.status).toBe('revoked');
  });
});

describe('every route', () => {
  it('is relative to the axios baseURL, which already ends in /api/v1/', async () => {
    // Hardcoding '/api/v1/' here would produce /api/v1/api/v1/register/… and
    // 404 against a deployed backend while looking fine in a mock.
    await listRegisterDevices();
    await createRegisterDevice({ name: 'x' });
    await updateRegisterDevice('dev-1', { name: 'x' });
    await reissuePairingCode('dev-1');
    await revokeRegisterDevice('dev-1');

    const urls = [...get.mock.calls, ...post.mock.calls, ...patch.mock.calls].map((call) => call[0] as string);
    expect(urls).toHaveLength(5);
    urls.forEach((url) => {
      expect(url.startsWith('/register/')).toBe(true);
      expect(url).not.toContain('/api/v1/');
    });
  });
});
