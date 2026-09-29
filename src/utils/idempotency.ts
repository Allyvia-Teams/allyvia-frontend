/**
 * Client-minted keys for writes that must not apply twice (ALL-83).
 *
 * The failure these guard against is a lost RESPONSE, not a lost request. The
 * clerk taps Complete Checkout, the server commits, the reply never arrives,
 * and the clerk — who cannot tell the difference — taps again. Only a key
 * minted BEFORE the first attempt, and reused by every retry of that same
 * attempt, lets the server tell a retry from a second sale.
 *
 * Mint one when the form OPENS, hold it in a ref, and send it on every submit
 * from that form. Minting per submit would defeat the whole thing: each tap
 * would carry a fresh key and the server would see two unrelated writes.
 *
 * Kept free of imports on purpose — `utils/axios` pulls in `utils/mockApi`,
 * which reads sessionStorage at module load and cannot be imported under
 * vitest's node environment, so anything that wants a unit test has to stay
 * out of that graph.
 */

/**
 * A key unique to one attempt at one write.
 *
 * `crypto.randomUUID` is available in every browser the till runs on; the
 * fallback keeps a non-secure-context dev server (plain http, not localhost)
 * from losing idempotency entirely, which would be a silent downgrade rather
 * than a visible failure.
 */
export function newIdempotencyKey(prefix = 'pos'): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
