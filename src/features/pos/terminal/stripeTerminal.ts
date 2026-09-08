// Stripe Terminal (card-present) glue for the POS register.
//
// The SDK is Stripe's hosted Terminal JS (https://js.stripe.com/terminal/v1/),
// loaded on demand the first time a card payment starts — the POS bundle pays
// nothing for it until a card is actually charged. It is injected as a script
// tag (the same way @stripe/terminal-js does it under the hood) so no npm
// dependency or bundler config is needed, and card data never touches Allyvia
// code: the reader talks to Stripe directly, we only pass the PaymentIntent's
// client_secret through.
//
// Everything is scoped to the signed-in store: the SDK authenticates with
// ConnectionTokens minted by POST /api/stripe/connection-token, which the
// backend creates *on the store's connected account* (direct charges — the
// boutique is the merchant of record).

import stripeApi, { type StripeReaderInfo } from 'api/stripe.api';

// --- Minimal typings for the pieces of the Terminal JS SDK we use. ---------

export interface TerminalReader {
  id: string;
  label?: string;
  device_type?: string;
  serial_number?: string;
  status?: string;
}

interface TerminalError {
  code?: string;
  message: string;
}

interface DiscoverResult {
  discoveredReaders?: TerminalReader[];
  error?: TerminalError;
}

interface ConnectResult {
  reader?: TerminalReader;
  error?: TerminalError;
}

interface PaymentIntentResult {
  paymentIntent?: { id: string; status: string };
  error?: TerminalError & { payment_intent?: { id: string; status: string } };
}

export interface StripeTerminalInstance {
  discoverReaders(options?: { simulated?: boolean; location?: string }): Promise<DiscoverResult>;
  connectReader(reader: TerminalReader): Promise<ConnectResult>;
  disconnectReader(): Promise<void>;
  getConnectionStatus(): 'connected' | 'connecting' | 'not_connected';
  getConnectedReader(): TerminalReader | null;
  collectPaymentMethod(clientSecret: string): Promise<PaymentIntentResult>;
  cancelCollectPaymentMethod(): Promise<{ error?: TerminalError }>;
  processPayment(paymentIntent: unknown): Promise<PaymentIntentResult>;
  clearCachedCredentials(): void;
}

interface StripeTerminalStatic {
  create(options: { onFetchConnectionToken: () => Promise<string>; onUnexpectedReaderDisconnect: () => void }): StripeTerminalInstance;
}

declare global {
  interface Window {
    StripeTerminal?: StripeTerminalStatic;
  }
}

const SDK_URL = 'https://js.stripe.com/terminal/v1/';

// Sandbox switch: with no physical WisePOS E on the desk, the SDK's built-in
// simulated reader stands in (it auto-presents a Stripe test card). Set
// VITE_STRIPE_TERMINAL_SIMULATED=true in .env for local/sandbox work.
export const isSimulatedTerminal = () => String(import.meta.env.VITE_STRIPE_TERMINAL_SIMULATED) === 'true';

let sdkPromise: Promise<StripeTerminalStatic> | null = null;

function loadTerminalSdk(): Promise<StripeTerminalStatic> {
  if (window.StripeTerminal) return Promise.resolve(window.StripeTerminal);
  if (!sdkPromise) {
    sdkPromise = new Promise<StripeTerminalStatic>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => {
        if (window.StripeTerminal) resolve(window.StripeTerminal);
        else reject(new Error('Stripe Terminal SDK loaded but did not initialize.'));
      };
      script.onerror = () => {
        sdkPromise = null; // allow a retry after a transient network failure
        reject(new Error('Could not load the Stripe Terminal SDK. Check the network connection.'));
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
}

// One Terminal instance per store. ConnectionTokens are account-scoped, so a
// role/company switch must throw the old instance (and its cached credentials)
// away rather than let register A talk to Stripe as store B.
let terminal: StripeTerminalInstance | null = null;
let terminalCompanyId: string | null = null;

export async function getTerminal(companyId: string): Promise<StripeTerminalInstance> {
  if (terminal && terminalCompanyId === companyId) return terminal;
  if (terminal) {
    try {
      terminal.clearCachedCredentials();
      await terminal.disconnectReader();
    } catch {
      // best-effort teardown; a stale instance must never block a new session
    }
  }
  const sdk = await loadTerminalSdk();
  terminal = sdk.create({
    onFetchConnectionToken: async () => {
      const token = await stripeApi.createConnectionToken(companyId);
      return token.secret;
    },
    onUnexpectedReaderDisconnect: () => {
      // Surfaced naturally on the next action's error; nothing to do globally.
    }
  });
  terminalCompanyId = companyId;
  return terminal;
}

export interface DiscoveredReaders {
  readers: TerminalReader[];
  simulated: boolean;
}

// Discover the readers this register can reach. Registered readers come from
// the backend mirror (labels, status) but connection happens SDK-side against
// the discovery result, so the SDK's reader objects are what we return.
export async function discoverReaders(companyId: string): Promise<DiscoveredReaders> {
  const t = await getTerminal(companyId);
  const simulated = isSimulatedTerminal();
  const result = await t.discoverReaders(simulated ? { simulated: true } : {});
  if (result.error) throw new Error(result.error.message);
  return { readers: result.discoveredReaders ?? [], simulated };
}

export async function connectReader(companyId: string, reader: TerminalReader): Promise<TerminalReader> {
  const t = await getTerminal(companyId);
  if (t.getConnectionStatus() === 'connected') {
    const current = t.getConnectedReader();
    if (current?.id === reader.id) return current;
    await t.disconnectReader();
  }
  const result = await t.connectReader(reader);
  if (result.error || !result.reader) {
    throw new Error(result.error?.message || 'Could not connect to the reader.');
  }
  return result.reader;
}

export class CardDeclinedError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'CardDeclinedError';
    this.code = code;
  }
}

// Run one collection attempt on the connected reader: prompt for the card,
// then confirm the PaymentIntent. Throws CardDeclinedError on a decline (the
// intent reverts to requires_payment_method and THIS SAME function can be
// called again with the same client_secret to retry) and Error on anything
// else (reader offline, SDK not connected, cancellation).
export async function collectAndProcess(companyId: string, clientSecret: string): Promise<{ paymentIntentId: string; status: string }> {
  const t = await getTerminal(companyId);
  if (t.getConnectionStatus() !== 'connected') {
    throw new Error('No card reader is connected.');
  }

  const collected = await t.collectPaymentMethod(clientSecret);
  if (collected.error || !collected.paymentIntent) {
    throw new Error(collected.error?.message || 'Card was not presented.');
  }

  const processed = await t.processPayment(collected.paymentIntent);
  if (processed.error) {
    // A decline keeps the intent retryable; surface it as such.
    throw new CardDeclinedError(processed.error.message || 'The card was declined.', processed.error.code);
  }
  if (!processed.paymentIntent) {
    throw new Error('The payment did not complete. Please try again.');
  }
  return { paymentIntentId: processed.paymentIntent.id, status: processed.paymentIntent.status };
}

/**
 * Stop an in-progress reader prompt before a payment method has been
 * collected. This does not cancel the PaymentIntent or void the draft sale;
 * both remain available for a retry of the same checkout.
 */
export async function cancelPaymentCollection(companyId: string): Promise<void> {
  const t = await getTerminal(companyId);
  if (t.getConnectionStatus() !== 'connected') {
    throw new Error('No card reader is connected.');
  }
  const result = await t.cancelCollectPaymentMethod();
  if (result.error) {
    throw new Error(result.error.message || 'The reader could not cancel the charge.');
  }
}

// Convenience for the checkout UI: which registered readers does the backend
// know about (labels + online state for the picker), passed through untouched.
export async function listRegisteredReaders(companyId: string): Promise<StripeReaderInfo[]> {
  return stripeApi.listReaders(companyId);
}
