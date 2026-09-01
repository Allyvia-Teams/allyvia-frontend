export const scannerCommit = (events: Array<{ key: string; at: number }>, threshold = 35): string | null => {
  if (!events.length || events[events.length - 1].key !== 'Enter' || events.length < 5) return null;
  const chars = events.slice(0, -1);
  if (chars.some((e) => e.key.length !== 1) || chars.some((e, i) => i && e.at - chars[i - 1].at > threshold)) return null;
  const code = chars.map((e) => e.key).join('');
  return code.length >= 4 ? code : null;
};
export const shouldIgnoreTarget = (
  target: { tagName?: string; isContentEditable?: boolean; getAttribute?: (name: string) => string | null } | null
) =>
  !!target &&
  target.getAttribute?.('data-barcode-scan-field') !== 'true' &&
  (['INPUT', 'TEXTAREA'].includes(target.tagName || '') || !!target.isContentEditable);
