// ALL-58: read an AP-aging bucket by its label, never by array position.
// Falls back to an explicit 0 — never a neighboring bucket's value — if
// the requested label isn't present (e.g. buckets arrive reordered, or
// a bucket is missing for this tenant).
export function getBucketValueByLabel(labels: string[], data: number[], targetLabel: string): number {
  const index = labels.indexOf(targetLabel);
  return index >= 0 ? data[index] || 0 : 0;
}