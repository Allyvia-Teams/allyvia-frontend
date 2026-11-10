import { describe, expect, it, vi } from 'vitest';

import { runConnectFlow } from './connectFlow';
import type { StripeJs } from './stripeJs';

const connection = { id: 1, institution_name: 'StripeBank' } as any;

function deps(result: Awaited<ReturnType<StripeJs['collectFinancialConnectionsAccounts']>>) {
  const collect = vi.fn().mockResolvedValue(result);
  return {
    collect,
    createSession: vi.fn().mockResolvedValue('fcsess_secret'),
    loadStripe: vi.fn().mockResolvedValue({ collectFinancialConnectionsAccounts: collect }),
    link: vi.fn().mockResolvedValue([connection])
  };
}

describe('runConnectFlow', () => {
  it('posts only the session id after the user links accounts', async () => {
    const d = deps({ financialConnectionsSession: { id: 'fcsess_1', accounts: [{ id: 'fca_1' }] } });
    const outcome = await runConnectFlow(d);
    expect(d.collect).toHaveBeenCalledWith({ clientSecret: 'fcsess_secret' });
    expect(d.link).toHaveBeenCalledWith('fcsess_1');
    expect(outcome).toEqual({ kind: 'linked', connections: [connection] });
  });

  it('treats closing the modal without linking as a quiet cancel', async () => {
    const d = deps({ financialConnectionsSession: { id: 'fcsess_1', accounts: [] } });
    expect(await runConnectFlow(d)).toEqual({ kind: 'cancelled' });
    expect(d.link).not.toHaveBeenCalled();
  });

  it('surfaces a Stripe.js error', async () => {
    const d = deps({ error: { message: 'Bank unavailable' } });
    expect(await runConnectFlow(d)).toEqual({ kind: 'error', message: 'Bank unavailable' });
    expect(d.link).not.toHaveBeenCalled();
  });

  it('surfaces the server detail when linking is rejected', async () => {
    const d = deps({ financialConnectionsSession: { id: 'fcsess_1', accounts: [{ id: 'fca_1' }] } });
    d.link.mockRejectedValue({ response: { data: { detail: 'This bank session does not belong to your business.' } } });
    expect(await runConnectFlow(d)).toEqual({
      kind: 'error',
      message: 'This bank session does not belong to your business.'
    });
  });

  it('reports a failure to load Stripe.js', async () => {
    const d = deps({});
    d.loadStripe.mockRejectedValue(new Error('Stripe.js could not be loaded.'));
    expect(await runConnectFlow(d)).toEqual({ kind: 'error', message: 'Stripe.js could not be loaded.' });
  });
});
