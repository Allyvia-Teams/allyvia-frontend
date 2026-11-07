import type { RecordStorage } from '../visitRecord';

/** A Map-backed sessionStorage stand-in for node tests. */
export const memoryStorage = (initial: Record<string, string> = {}): RecordStorage & { data: Map<string, string> } => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, String(value));
    }
  };
};
