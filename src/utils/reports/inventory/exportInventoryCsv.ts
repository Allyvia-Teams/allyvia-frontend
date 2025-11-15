import type { InventoryItem } from 'types/inventory';
import { downloadCSV } from 'utils/csvDownload';

export function downloadInventoryTableCsv(filename: string, rows: InventoryItem[]) {
  if (!rows || rows.length === 0) {
    downloadCSV(filename, [], []);
    return;
  }

  // Collect all keys across all rows, with a preferred ordering first
  const preferredOrder = [
    'id',
    'sku',
    'name',
    'barcode',
    'description',
    'category',
    'quantity_on_hand',
    'reorder_point',
    'max_stock_level',
    'unit_price',
    'cost_price',
    'item_type',
    'status',
    'is_taxable',
    'weight',
    'dimensions_length',
    'dimensions_width',
    'dimensions_height',
    'location',
    'bin_location',
    'value'
  ];

  const keySet = new Set<string>();
  rows.forEach((r) => Object.keys(r as any).forEach((k) => keySet.add(k)));

  const extraKeys = Array.from(keySet)
    .filter((k) => !preferredOrder.includes(k))
    .sort();
  const headers = [...preferredOrder.filter((k) => keySet.has(k)), ...extraKeys];

  const coerceCell = (value: any) => {
    if (value == null) return '';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const mapped = rows.map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((h) => {
      obj[h] = coerceCell((row as any)[h]);
    });
    return obj;
  });

  downloadCSV(filename, mapped, headers);
}

export function downloadInventoryAllCsv(filename: string, allItems: InventoryItem[]) {
  return downloadInventoryTableCsv(filename, allItems);
}

// Removed summary CSV per request (single CSV export only)
