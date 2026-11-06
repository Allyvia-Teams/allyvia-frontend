/** The line shown above the inventory table while the catalogue is still arriving. */
export function inventoryLoadLabel(progress: { loaded: number; total: number | null }): string {
  if (progress.total === null) return 'Loading inventory…';
  const loaded = Math.min(progress.loaded, progress.total);
  return `Loading inventory… ${loaded.toLocaleString('en-US')} of ${progress.total.toLocaleString('en-US')} items`;
}
