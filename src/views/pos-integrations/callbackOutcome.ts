// What the OAuth callback page does when the API, not the browser, finished
// the token exchange: Shopify and Clover redirect the merchant to the backend,
// which exchanges the code and bounces here with `connection`, `provider` and
// `status` instead of `code` and `state`.
//
// Pure, so the rule is testable without rendering the page (which pulls in the
// API client). `label` is passed in for the same reason.

export type BackendFinishedOutcome = { navigateTo: string } | { error: string } | null;

export function backendFinishedOutcome(params: URLSearchParams, label: string): BackendFinishedOutcome {
  const connectionId = params.get('connection');
  const status = params.get('status');
  if (!connectionId || (status !== 'connected' && status !== 'failed')) return null;
  if (status === 'failed') {
    return { error: `We couldn’t finish connecting ${label}. Please start the connection again from the integrations page.` };
  }
  return { navigateTo: `/integrations/pos/connect/${params.get('provider') ?? 'square'}` };
}
