/**
 * Minimal Stripe.js (v3) loader for Financial Connections.
 *
 * Loaded by script tag from js.stripe.com (Stripe requires that origin), the same
 * precedent as the Terminal SDK in features/pos/terminal/stripeTerminal.ts. Only the
 * one method this feature uses is typed.
 */

export interface FinancialConnectionsResult {
  financialConnectionsSession?: { id: string; accounts: Array<{ id: string }> };
  error?: { type?: string; code?: string; message?: string };
}

export interface StripeJs {
  collectFinancialConnectionsAccounts(options: { clientSecret: string }): Promise<FinancialConnectionsResult>;
}

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeJs;
  }
}

const STRIPE_JS_URL = 'https://js.stripe.com/v3/';

let instance: Promise<StripeJs> | null = null;

export function publishableKey(env: ImportMetaEnv = import.meta.env): string {
  return (env.VITE_STRIPE_PUBLISHABLE_KEY || '').trim();
}

export function loadStripeJs(key: string = publishableKey()): Promise<StripeJs> {
  if (!key) return Promise.reject(new Error('Stripe is not configured for this site.'));
  if (instance) return instance;
  instance = new Promise<StripeJs>((resolve, reject) => {
    const ready = () => (window.Stripe ? resolve(window.Stripe(key)) : reject(new Error('Stripe.js did not load.')));
    if (window.Stripe) return ready();
    const script = document.createElement('script');
    script.src = STRIPE_JS_URL;
    script.async = true;
    script.onload = ready;
    script.onerror = () => reject(new Error('Stripe.js could not be loaded. Check your connection and try again.'));
    document.head.appendChild(script);
  }).catch((err) => {
    instance = null; // allow a retry after a network blip
    throw err;
  });
  return instance;
}
