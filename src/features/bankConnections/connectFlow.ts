import type { BankConnection } from 'api/bankConnections';
import type { StripeJs } from './stripeJs';

export type ConnectOutcome = { kind: 'linked'; connections: BankConnection[] } | { kind: 'cancelled' } | { kind: 'error'; message: string };

export interface ConnectDeps {
  createSession: () => Promise<string>;
  loadStripe: () => Promise<StripeJs>;
  link: (sessionId: string) => Promise<BankConnection[]>;
}

/**
 * Create a session, run Stripe's modal, then hand the session id to the server.
 *
 * Only the session id goes back: the server re-reads the session from Stripe and
 * never trusts the browser's account list. Closing the modal without linking
 * resolves with an empty `accounts` array, which is a quiet `cancelled`, not an error.
 */
export async function runConnectFlow(deps: ConnectDeps): Promise<ConnectOutcome> {
  try {
    const [clientSecret, stripe] = await Promise.all([deps.createSession(), deps.loadStripe()]);
    const result = await stripe.collectFinancialConnectionsAccounts({ clientSecret });
    if (result.error) {
      return { kind: 'error', message: result.error.message || 'The bank connection could not be completed.' };
    }
    const session = result.financialConnectionsSession;
    if (!session || !session.accounts || session.accounts.length === 0) return { kind: 'cancelled' };
    return { kind: 'linked', connections: await deps.link(session.id) };
  } catch (err: any) {
    const detail = err?.response?.data?.detail;
    return { kind: 'error', message: typeof detail === 'string' ? detail : err?.message || 'The bank connection could not be completed.' };
  }
}
