import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type InvKPI = { label: string; value: string | number; sublabel?: string };
export type InvTableCol = { header: string; dataKey: string; widthPct?: number; align?: 'left' | 'center' | 'right' };
export type InvTableSection = { kind: 'table'; title: string; columns: InvTableCol[]; rows: any[] };
export type InvInsightsSection = { kind: 'insights'; title: string; bullets: string[] };
export type InvSection = InvTableSection | InvInsightsSection;

export type InvBrand = {
  headerBg: [number, number, number];
  headerText: [number, number, number];
  accent: [number, number, number];
  panelBg: [number, number, number];
  tableHeadBg: [number, number, number];
  tableBorder: [number, number, number];
};

export type BuildInventoryReportParams = {
  title: string;
  subtitle?: string;
  duration?: string;
  logoDataUrl?: string;
  brand?: Partial<InvBrand>;
  kpis?: InvKPI[];
  sections?: InvSection[];
  fileName?: string;
};

const DEFAULT_BRAND: InvBrand = {
  headerBg: [23, 37, 84],
  headerText: [255, 255, 255],
  accent: [59, 130, 246],
  panelBg: [248, 250, 252],
  tableHeadBg: [226, 232, 240],
  tableBorder: [203, 213, 225]
};

export async function buildInventoryPdfReport(params: BuildInventoryReportParams): Promise<void> {
  const { title, subtitle, duration, logoDataUrl, brand: brandOverrides, kpis = [], sections = [], fileName } = params;

  const brand: InvBrand = { ...DEFAULT_BRAND, ...(brandOverrides || {}) } as InvBrand;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() };
  const MARGIN = { top: 14, right: 14, bottom: 16, left: 14 };
  const HEADER_H = 18;
  const FOOTER_H = 10;
  const GAP = 4;
  let cursorY = MARGIN.top + HEADER_H + GAP;
  const contentX = MARGIN.left;
  const contentW = page.w - MARGIN.left - MARGIN.right;

  const remaining = () => page.h - MARGIN.bottom - FOOTER_H - cursorY;
  function newPage() {
    doc.addPage();
    cursorY = MARGIN.top;
  }
  function ensureSpace(h: number) {
    if (remaining() < h) newPage();
  }

  // Header
  doc.setFillColor(...brand.headerBg);
  doc.rect(0, 0, page.w, HEADER_H + MARGIN.top, 'F');
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', MARGIN.left, MARGIN.top - 2, 10, 10, undefined, 'FAST');
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
  if (duration) {
    doc.setFontSize(8);
    doc.text(duration, page.w - MARGIN.right, MARGIN.top + 16, { align: 'right', baseline: 'top' });
  }

  // KPI grid
  if (kpis.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('Inventory KPIs', contentX, cursorY);
    cursorY += 5;
    const COLS = 4;
    const cardW = (contentW - GAP * (COLS - 1)) / COLS;
    const cardH = 26;
    const drawCard = (x: number, y: number, k: InvKPI) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...brand.tableBorder);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
      // accent line
      doc.setDrawColor(...brand.accent);
      doc.setLineWidth(0.8);
      doc.line(x, y, x + cardW, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(String(k.label ?? ''), x + 4, y + 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(String(k.value ?? ''), x + 4, y + 16);
      if (k.sublabel) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(90);
        doc.text(String(k.sublabel), x + 4, y + 22);
      }
    };
    for (let i = 0; i < kpis.length; i += COLS) {
      const row = kpis.slice(i, i + COLS);
      ensureSpace(cardH + GAP);
      let x = contentX;
      row.forEach((k) => {
        drawCard(x, cursorY, k);
        x += cardW + GAP;
      });
      cursorY += cardH + GAP;
    }
    cursorY += 2;
  }

  // Sections
  for (const s of sections) {
    if (s.kind === 'insights') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(s.title, contentX, cursorY);
      cursorY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const lineH = 5;
      for (const b of s.bullets) {
        ensureSpace(lineH);
        doc.circle(contentX + 1.5, cursorY - 1.5, 0.6, 'F');
        doc.text(b, contentX + 4, cursorY);
        cursorY += lineH;
      }
      cursorY += 2;
    } else if (s.kind === 'table') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(s.title, contentX, cursorY);
      cursorY += 4;
      const head = [s.columns.map((c) => c.header)];
      const body = s.rows.map((r) => s.columns.map((c) => r[c.dataKey] ?? ''));
      const colWidths = s.columns.map((c) => c.widthPct ?? 100 / s.columns.length);
      const totalPct = colWidths.reduce((a, b) => a + b, 0);
      const columnStyles = Object.fromEntries(
        s.columns.map((c, i) => [
          i,
          { cellWidth: (colWidths[i] / totalPct) * (page.w - MARGIN.left - MARGIN.right), halign: c.align ?? inferAlign(c.header) }
        ])
      );
      autoTable(doc, {
        startY: cursorY,
        margin: { top: MARGIN.top, right: MARGIN.right, bottom: MARGIN.bottom, left: MARGIN.left },
        head,
        body,
        styles: { font: 'helvetica', fontSize: 9, lineColor: brand.tableBorder, lineWidth: 0.1, cellPadding: 2 },
        headStyles: { fillColor: brand.tableHeadBg, textColor: [0, 0, 0], lineColor: brand.tableBorder, fontStyle: 'bold' },
        bodyStyles: { fillColor: [249, 250, 251] },
        columnStyles,
        rowPageBreak: 'avoid',
        pageBreak: 'auto'
      });
      // @ts-ignore
      cursorY = (doc as any).lastAutoTable.finalY + 4;
    }
  }

  // Footer
  const pageCount = (doc as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const y = page.h - MARGIN.bottom + 4;
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(title, MARGIN.left, y);
    doc.text(`Page ${i} of ${pageCount}`, page.w - MARGIN.right, y, { align: 'right' });
  }

  const safeName = (fileName || `${title}.pdf`).replace(/[^a-z0-9-_\.]+/gi, '_');
  doc.save(safeName);
}

function inferAlign(header: string): 'left' | 'center' | 'right' {
  const h = (header || '').toLowerCase();
  if (/(amount|total|value|price|usd|\$)/.test(h)) return 'right';
  if (/(date|status|type)/.test(h)) return 'center';
  return 'left';
}
