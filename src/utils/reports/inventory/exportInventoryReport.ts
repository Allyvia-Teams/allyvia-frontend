import { buildInventoryPdfReport } from './inventoryPdfReports';
import type { InventoryItem, InventorySummary } from 'types/inventory';
import { isLowStock, isOutOfStock } from 'utils/lowStock';

type KPI = { label: string; value: string | number; sublabel?: string };
const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
const todayISO = () => new Date().toISOString().slice(0, 10);

export async function exportInventoryPdf(params: {
  title?: string;
  duration?: string;
  items: InventoryItem[];
  summary?: InventorySummary;
}) {
  const { title = 'Inventory Report', duration = `As of ${todayISO()}`, items, summary } = params;

  const totalItems = summary?.total_items ?? items.length;
  const totalValue = summary?.inventory_value ?? items.reduce((a, b) => a + b.unit_price * b.quantity_on_hand, 0);
  // The shared rule (ALL-98). The old expression coerced a missing reorder
  // point to -1 and required qty > 0, so it disagreed with the tile above it
  // in both directions. A report is counted over the rows it actually
  // contains, so unlike the KPI tile this fallback is a real answer.
  const lowStock = summary?.low_stock ?? items.filter(isLowStock).length;
  const outOfStock = summary?.out_of_stock ?? items.filter(isOutOfStock).length;

  const kpis: KPI[] = [
    { label: 'Total Items', value: totalItems },
    { label: 'Low Stock', value: lowStock },
    { label: 'Out of Stock', value: outOfStock },
    { label: 'Inventory Value', value: fmtUSD(typeof totalValue === 'string' ? parseFloat(totalValue) : totalValue) }
  ];

  const columns = ['name', 'sku', 'barcode', 'quantity_on_hand', 'reorder_point', 'unit_price', 'cost_price', 'category'];
  const rows = items.map((i) => ({
    name: i.name,
    sku: i.sku ?? '',
    barcode: i.barcode ?? '',
    quantity_on_hand: i.quantity_on_hand,
    reorder_point: i.reorder_point ?? '',
    unit_price: fmtUSD(i.unit_price ?? 0),
    cost_price: fmtUSD(i.cost_price ?? 0),
    category: i.category ?? ''
  }));

  const insights: string[] = [];
  if (outOfStock > 0) insights.push(`${outOfStock} item(s) are out of stock.`);
  if (lowStock > 0) insights.push(`${lowStock} item(s) are low on stock (≤ reorder point).`);

  await buildInventoryPdfReport({
    title,
    subtitle: `Generated on ${new Date().toLocaleDateString()}`,
    duration,
    kpis,
    sections: [
      {
        kind: 'table',
        title: 'Current Inventory',
        columns: columns.map((h) => ({ header: h, dataKey: h, widthPct: 100 / columns.length })),
        rows
      },
      ...(insights.length ? [{ kind: 'insights' as const, title: 'Insights', bullets: insights }] : [])
    ],
    fileName: `${title.replace(/\s+/g, '_')}_${todayISO()}.pdf`
  });
}

export async function quickExportInventoryPdf(params: {
  title?: string;
  duration?: string;
  logoPath?: string;
  items: InventoryItem[];
  summary?: InventorySummary;
}) {
  return exportInventoryPdf(params);
}
