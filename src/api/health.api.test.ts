import { describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('utils/axios', () => ({ default: { get: (...args: unknown[]) => get(...args) } }));
vi.mock('store', () => ({ useSelector: vi.fn() }));
import { fetchCashContext, fetchHealth } from './health.api';

describe('fetchHealth', () => {
  it('is the polled read and never asks for the cash context', async () => {
    get.mockResolvedValueOnce({ data: { company_id: 'c', role_id: 'r', scope: 'company' } });
    await fetchHealth('c', 'r');
    expect(get).toHaveBeenLastCalledWith('agent/health/');
  });
});

describe('fetchCashContext', () => {
  it('asks the health read for the cash context and checks whose answer it is', async () => {
    get.mockResolvedValueOnce({ data: { company_id: 'c', role_id: 'r', cash_context: { status: 'observed' } } });
    await expect(fetchCashContext('c', 'r')).resolves.toEqual({ status: 'observed' });
    expect(get).toHaveBeenCalledWith('agent/health/', { params: { include: 'cash_context' } });
  });

  it('refuses an answer for another company or role', async () => {
    get.mockResolvedValueOnce({ data: { company_id: 'other', role_id: 'r', cash_context: { status: 'observed' } } });
    await expect(fetchCashContext('c', 'r')).rejects.toThrow('scope changed');
  });
});
