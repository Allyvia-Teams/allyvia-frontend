import type { InventoryItem, InventorySummary } from 'types/inventory';
import { downloadCSV } from 'utils/csvDownload';

export function downloadInventoryTableCsv(filename: string, rows: InventoryItem[]) {
  if (!rows || rows.length === 0) {
    downloadCSV(filename, [], []);
    return;
  }

  // Backend fields only
  const headers = ['sku', 'name', 'barcode', 'quantity_on_hand', 'unit_price', 'cost_price', 'category', 'reorder_point'];

  const formatValue = (value: any) => {
    if (value == null) return '';
    const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
    if (!Number.isNaN(parsed)) {
      return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(2);
    }
    return String(value);
  };

  const mapped = rows.map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((h) => {
      obj[h] = formatValue((row as any)[h]);
    });
    return obj;
  });

  downloadCSV(filename, mapped, headers);
}

export function downloadInventoryAllCsv(filename: string, allItems: InventoryItem[]) {
  return downloadInventoryTableCsv(filename, allItems);
}

export function downloadInventorySummaryCsv(
  filename: string,
  args: { items: InventoryItem[]; summary?: InventorySummary; period?: string }
) {
  const { items, summary, period } = args;
  const totalItems = summary?.total_items ?? items.length;
  const totalValue = summary?.total_value ?? items.reduce((a, b) => a + ((b as any).value ?? b.unit_price * b.quantity_on_hand), 0);
  const lowStock = items.filter(
    (i) => i.quantity_on_hand > 0 && (i.reorder_point ?? -1) >= 0 && i.quantity_on_hand <= (i.reorder_point ?? -1)
  ).length;
  const outOfStock = items.filter((i) => i.quantity_on_hand === 0).length;
  const headers = ['metric', 'value', 'period'];
  const rows = [
    { metric: 'Total Items', value: totalItems, period: period ?? summary?.period ?? '' },
    { metric: 'Low Stock', value: lowStock, period: period ?? summary?.period ?? '' },
    { metric: 'Out of Stock', value: outOfStock, period: period ?? summary?.period ?? '' },
    { metric: 'Inventory Value', value: totalValue, period: period ?? summary?.period ?? '' }
  ];
  downloadCSV(filename, rows, headers);
}
