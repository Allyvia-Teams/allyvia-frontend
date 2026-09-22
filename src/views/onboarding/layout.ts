import type { ParsePreview } from 'api/onboarding.api';

export function headerChoice(choice: string, preview: ParsePreview | undefined): { forceHeader: boolean; headerRow?: number } | null {
  if (!preview?.rows.length) return null;
  if (choice === 'none') return { forceHeader: false };
  const row = preview.rows.find((entry) => String(entry.row_number) === choice && entry.selectable);
  return row ? { forceHeader: true, headerRow: row.row_number } : null;
}
