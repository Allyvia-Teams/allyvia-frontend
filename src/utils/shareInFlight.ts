/**
 * Shares one request between callers that ask for the same thing at the same
 * time. The header's sync indicator and the page under it both load
 * integration status on mount; with this, a reload sends one request and both
 * callers get its answer. Once the request settles, the next call starts a new
 * one, so nothing is ever served stale.
 */
export function shareInFlight<A extends unknown[], T>(keyOf: (...args: A) => string, request: (...args: A) => Promise<T>) {
  const pending = new Map<string, Promise<T>>();
  return (...args: A): Promise<T> => {
    const key = keyOf(...args);
    const existing = pending.get(key);
    if (existing) return existing;
    const started = request(...args).finally(() => pending.delete(key));
    pending.set(key, started);
    return started;
  };
}
