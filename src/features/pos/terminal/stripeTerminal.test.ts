import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('api/stripe.api', () => ({
  default: { createConnectionToken: vi.fn() }
}));

describe('cancelPaymentCollection', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('cancels collection on the connected reader', async () => {
    const cancelCollectPaymentMethod = vi.fn().mockResolvedValue({});
    const terminal = {
      getConnectionStatus: () => 'connected',
      cancelCollectPaymentMethod,
      clearCachedCredentials: vi.fn(),
      disconnectReader: vi.fn()
    };
    (globalThis as any).window = {
      StripeTerminal: { create: () => terminal }
    };

    const { cancelPaymentCollection } = await import('./stripeTerminal');
    await cancelPaymentCollection('company-1');

    expect(cancelCollectPaymentMethod).toHaveBeenCalledTimes(1);
  });

  it('surfaces an SDK cancellation failure', async () => {
    const terminal = {
      getConnectionStatus: () => 'connected',
      cancelCollectPaymentMethod: vi.fn().mockResolvedValue({ error: { message: 'Already processing' } }),
      clearCachedCredentials: vi.fn(),
      disconnectReader: vi.fn()
    };
    (globalThis as any).window = {
      StripeTerminal: { create: () => terminal }
    };

    const { cancelPaymentCollection } = await import('./stripeTerminal');

    await expect(cancelPaymentCollection('company-1')).rejects.toThrow('Already processing');
  });
});
