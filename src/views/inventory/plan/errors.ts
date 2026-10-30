// The server's own words for a refusal (Inventory › Plan, buy planner B9). The plan endpoints answer
// `{detail}` for a refusal and `{errors: {field: sentence}}` for a form; the page shows those, and its own
// fallback only when the body carries nothing usable.

interface ErrorLike {
  response?: { status?: number; data?: unknown };
}

const body = (error: unknown): Record<string, unknown> | null => {
  const data = (error as ErrorLike)?.response?.data;
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
};

const firstString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value;
  if (Array.isArray(value)) return value.find((v): v is string => typeof v === 'string' && v.trim() !== '') ?? null;
  return null;
};

export const fieldErrors = (error: unknown): Record<string, string> => {
  const errors = body(error)?.errors;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return {};
  const out: Record<string, string> = {};
  Object.entries(errors as Record<string, unknown>).forEach(([field, value]) => {
    const sentence = firstString(value);
    if (sentence) out[field] = sentence;
  });
  return out;
};

export const serverSentence = (error: unknown, fallback: string): string => {
  if (!(error as ErrorLike)?.response) return 'That did not reach the server. Try again.';
  const detail = firstString(body(error)?.detail);
  if (detail) return detail;
  return Object.values(fieldErrors(error))[0] ?? fallback;
};
