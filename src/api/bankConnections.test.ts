import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
const del = vi.fn();
vi.mock('utils/axios', () => ({
  default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), delete: (...a: unknown[]) => del(...a) }
}));

import bankConnectionsApi from './bankConnections';

describe('bankConnectionsApi', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    del.mockReset();
  });

  it('returns only the client secret from connect-session', async () => {
    post.mockResolvedValue({ data: { client_secret: 'secret' } });
    expect(await bankConnectionsApi.createSession()).toBe('secret');
    expect(post).toHaveBeenCalledWith('/bank/connect-session/');
  });

  it('links by session id only', async () => {
    post.mockResolvedValue({ data: { results: [] } });
    await bankConnectionsApi.link('fcsess_1');
    expect(post).toHaveBeenCalledWith('/bank/connections/', { session_id: 'fcsess_1' });
  });

  it('lists, pages transactions and disconnects', async () => {
    get.mockResolvedValue({ data: { results: [] } });
    await bankConnectionsApi.list();
    expect(get).toHaveBeenCalledWith('/bank/connections/');
    await bankConnectionsApi.transactions(7, { page: 2, page_size: 25 });
    expect(get).toHaveBeenLastCalledWith('/bank/connections/7/transactions/', { params: { page: 2, page_size: 25 } });
    del.mockResolvedValue({ data: {} });
    await bankConnectionsApi.disconnect(7);
    expect(del).toHaveBeenCalledWith('/bank/connections/7/');
  });
});
