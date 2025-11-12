import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type KPI = { label: string; value: string | number };
type CategoryRow = { category: string; total_quantity: number; total_value: number; percentage: number };
type AlertRow = { name: string; sku: string; qty: number; reorder_point?: number };

export async function downloadInventoryPdf(args: {
  title?: string;
  subtitle?: string;
  kpis: KPI[];
  categories: CategoryRow[];
  alerts: AlertRow[];
  logoDataUrl?: string;
  filename?: string;
}) {
  const { title = 'Inventory Report', subtitle, kpis, categories, alerts, logoDataUrl, filename = 'inventory_report.pdf' } = args;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
  // Inline brand to mirror finance report styling
  const brand = {
    headerBg: [15, 23, 42], // slate-900
    headerText: [255, 255, 255], // white
    accent: [59, 130, 246], // blue-500
    tableHeadBg: [226, 232, 240], // slate-200
    tableBorder: [203, 213, 225] // slate-300
  } as const;
  const MARGIN = { top: 16, left: 14, right: 14 } as const;
  const HEADER_H = 16;
  const GAP = 4;
  let cursorY = HEADER_H + MARGIN.top + GAP + 6;
  const contentX = MARGIN.left;
  const contentW = page.w - MARGIN.left - MARGIN.right;

  function drawHeader() {
    doc.setFillColor(...brand.headerBg);
    doc.rect(0, 0, page.w, HEADER_H + MARGIN.top, 'F');

    if (logoDataUrl && typeof logoDataUrl === 'string') {
      const isDataUrl = /^data:image\/(png|jpg|jpeg);base64,/i.test(logoDataUrl);
      if (isDataUrl) {
        try {
          const lw = 24,
            lh = 10;
          doc.addImage(logoDataUrl, undefined as any, MARGIN.left, MARGIN.top - 2, lw, lh, undefined, 'FAST');
        } catch {
          // ignore bad logo
        }
      }
    }

    doc.setTextColor(...brand.headerText);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(title, page.w - MARGIN.right, MARGIN.top + 5, { align: 'right', baseline: 'top' });
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(subtitle, page.w - MARGIN.right, MARGIN.top + 11, { align: 'right', baseline: 'top' });
    }
  }

  drawHeader();

  // KPI cards (finance-style)
  const drawKpiGrid = (titleText: string, cards: KPI[]) => {
    if (!cards?.length) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(titleText, contentX, cursorY);
    cursorY += 5;

    const COLS = 3;
    const cardW = (contentW - GAP * (COLS - 1)) / COLS;
    const cardH = 26;

    const drawCard = (x: number, y: number, k: KPI) => {
      // Card container
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...brand.tableBorder);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
      // Accent top line
      doc.setDrawColor(...brand.accent);
      doc.setLineWidth(0.8);
      doc.line(x, y, x + cardW, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(String(k.label ?? ''), x + 4, y + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(0);
      doc.text(String(k.value ?? ''), x + 4, y + 16);
      doc.setTextColor(0);
    };

    for (let i = 0; i < cards.length; i += COLS) {
      const row = cards.slice(i, i + COLS);
      let x = contentX;
      row.forEach((k) => {
        drawCard(x, cursorY, k);
        x += cardW + GAP;
      });
      cursorY += cardH + GAP;
    }
    cursorY += 2;
  };

  drawKpiGrid('Key Metrics', kpis);

  // Categories
  doc.setFont('helvetica', 'bold');
  doc.text('Category Distribution', MARGIN.left, cursorY);
  cursorY += 4;
  doc.setFont('helvetica', 'normal');
  autoTable(doc, {
    startY: cursorY,
    head: [['Category', 'Total Quantity', 'Total Value', '%']],
    body: categories.map((c) => [c.category, String(c.total_quantity), String(c.total_value), `${c.percentage.toFixed(2)}%`]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: brand.tableHeadBg, textColor: [0, 0, 0] },
    margin: { left: MARGIN.left, right: MARGIN.right }
  } as any);
  cursorY = (doc as any).lastAutoTable.finalY + 6;

  // Alerts split: Out of Stock and Low Stock
  const outOfStockRows = alerts.filter((a) => Number(a.qty || 0) === 0);
  const lowStockRows = alerts.filter(
    (a) => Number(a.qty || 0) > 0 && (a.reorder_point ?? -1) >= 0 && Number(a.qty) <= Number(a.reorder_point)
  );

  if (outOfStockRows.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Out of Stock', MARGIN.left, cursorY);
    cursorY += 4;
    doc.setFont('helvetica', 'normal');
    autoTable(doc, {
      startY: cursorY,
      head: [['Name', 'SKU', 'Qty', 'Reorder Point']],
      body: outOfStockRows.map((a) => [a.name, a.sku, String(a.qty), a.reorder_point != null ? String(a.reorder_point) : '—']),
      styles: { fontSize: 9 },
      headStyles: { fillColor: brand.tableHeadBg, textColor: [0, 0, 0] },
      margin: { left: MARGIN.left, right: MARGIN.right }
    } as any);
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  if (lowStockRows.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Low Stock', MARGIN.left, cursorY);
    cursorY += 4;
    doc.setFont('helvetica', 'normal');
    autoTable(doc, {
      startY: cursorY,
      head: [['Name', 'SKU', 'Qty', 'Reorder Point']],
      body: lowStockRows.map((a) => [a.name, a.sku, String(a.qty), a.reorder_point != null ? String(a.reorder_point) : '—']),
      styles: { fontSize: 9 },
      headStyles: { fillColor: brand.tableHeadBg, textColor: [0, 0, 0] },
      margin: { left: MARGIN.left, right: MARGIN.right }
    } as any);
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  doc.save(filename);
}
