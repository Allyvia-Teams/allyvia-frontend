const NAMESPACE = 'allyvia.settings';

function ns(key: string) {
  return `${NAMESPACE}:${key}`;
}

export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(ns(key));
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(ns(key), value);
  } catch {}
}

export function getJSON<T>(key: string, fallback: T): T {
  const raw = getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON<T>(key: string, value: T): void {
  try {
    setItem(key, JSON.stringify(value));
  } catch {}
}
