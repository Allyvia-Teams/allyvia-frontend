// src/utils/financePdfReports.ts
// Pixel-perfect PDF builder for Finance reports using jsPDF + jspdf-autotable

import jsPDF from 'jspdf';
import autoTable, { Color, RowInput, UserOptions } from 'jspdf-autotable';

// ---------- Types ----------
import type { RGB, PDFKPI, TableCol, TableSection, InsightsSection, ChartSection, Section, Brand, BuildReportParams } from 'types/finance';
import { KPI } from './exportFinanceReport';

// Re-export types for backward compatibility
export type { RGB, PDFKPI as KPI, TableCol, TableSection, InsightsSection, ChartSection, Section, Brand, BuildReportParams };

// ---------- Defaults ----------
const DEFAULT_BRAND: Brand = {
  headerBg: [15, 23, 42], // slate-900
  headerText: [255, 255, 255], // white
  accent: [59, 130, 246], // blue-500
  panelBg: [241, 245, 249], // slate-100
  tableHeadBg: [226, 232, 240], // slate-200
  tableBorder: [203, 213, 225] // slate-300
};

// ---------- Public: load logo as Data URL ----------
export async function loadLogoAsDataUrl(path: string): Promise<string> {
  const res = await fetch(path);
  const blob = await res.blob();
  return await new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result));
    r.readAsDataURL(blob);
  });
}

// ---------- Public: main builder ----------
export async function buildFinancePdfReport(params: BuildReportParams): Promise<void> {
  const {
    title,
    subtitle,
    duration,
    logoDataUrl,
    brand: brandOverrides,
    kpis = [],
    statementKpis = [],
    charts = [],
    sections = [],
    fileName
  } = params;

  const brand: Brand = { ...DEFAULT_BRAND, ...(brandOverrides || {}) } as Brand;

  // A4 portrait
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const page = {
    w: doc.internal.pageSize.getWidth(),
    h: doc.internal.pageSize.getHeight()
  };

  // Layout constants
  const MARGIN = { top: 14, right: 14, bottom: 16, left: 14 };
  const HEADER_H = 18;
  const FOOTER_H = 10;
  const GAP = 4;

  // Content region (full width, no side panel)
  let cursorY = MARGIN.top + HEADER_H + GAP;
  let contentX = MARGIN.left;
  let contentW = page.w - MARGIN.left - MARGIN.right;

  // Helpers
  const remaining = () => page.h - MARGIN.bottom - FOOTER_H - cursorY;

  function newPage() {
    doc.addPage();
    // No header on subsequent pages
    cursorY = MARGIN.top;
    contentX = MARGIN.left;
    contentW = page.w - MARGIN.left - MARGIN.right;
  }

  function ensureSpace(h: number) {
    if (remaining() < h) newPage();
  }

  function getPageNumber() {
    return (doc as any).getCurrentPageInfo().pageNumber as number;
  }

  function drawHeader(pageIndex: number) {
    // Header band
    doc.setFillColor(...brand.headerBg);
    doc.rect(0, 0, page.w, HEADER_H + MARGIN.top, 'F');

    // Logo top-left
    if (logoDataUrl) {
      const lw = 24,
        lh = 10; // fits nicely
      doc.addImage(logoDataUrl, 'PNG', MARGIN.left, MARGIN.top - 2, lw, lh, undefined, 'FAST');
    }

    // Title & subtitle top-right
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

  function drawFooter(pageIndex: number, pageCount: number) {
    const y = page.h - MARGIN.bottom + 4;
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(title, MARGIN.left, y);
    doc.text(`Page ${pageIndex} of ${pageCount}`, page.w - MARGIN.right, y, { align: 'right' });
  }

  function wrapText(text: string, x: number, startY: number, width: number, lineH: number) {
    const words = String(text ?? '').split(/\s+/);
    let line = '';
    let y = startY;
    doc.setFontSize(9);
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      const w = doc.getTextWidth(test);
      if (w > width) {
        if (line) doc.text(line, x, y);
        line = words[i];
        y += lineH;
      } else {
        line = test;
      }
      if (i === words.length - 1) doc.text(line, x, y);
    }
  }

  function drawKpiGrid(titleText: string, cards: KPI[], pageLabel?: string) {
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
      // White background for the card
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...brand.tableBorder);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
      // accent line on top
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

      if (k.sublabel) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(90);
        doc.text(String(k.sublabel), x + 4, y + 22);
      }
      doc.setTextColor(0);
    };

    for (let i = 0; i < cards.length; i += COLS) {
      const row = cards.slice(i, i + COLS);
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

  function drawCharts(titleText: string, images: string[]) {
    if (!images?.length) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(titleText, contentX, cursorY);
    cursorY += 5;

    const chartH = 72;
    images.forEach((img) => {
      ensureSpace(chartH + 12);
      doc.setDrawColor(...brand.tableBorder);
      doc.roundedRect(contentX, cursorY, contentW, chartH + 8, 2, 2, 'FD');
      doc.addImage(img, 'PNG', contentX + 4, cursorY + 4, contentW - 8, chartH, undefined, 'FAST');
      cursorY += chartH + 12;
    });
  }

  function drawInsights(section: InsightsSection) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(section.title, contentX, cursorY);
    cursorY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lineH = 5;
    for (const b of section.bullets) {
      ensureSpace(lineH);
      // small filled bullet
      doc.circle(contentX + 1.5, cursorY - 1.5, 0.6, 'F');
      doc.text(b, contentX + 4, cursorY);
      cursorY += lineH;
    }
    cursorY += 2;
  }

  function drawTable(section: TableSection) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(section.title, contentX, cursorY);
    cursorY += 4;

    const head = [section.columns.map((c) => c.header)];
    const body: RowInput[] = section.rows.map((r) => section.columns.map((c) => r[c.dataKey] ?? ''));

    const colWidths = section.columns.map((c) => c.widthPct ?? 100 / section.columns.length);
    const totalPct = colWidths.reduce((a, b) => a + b, 0);
    const usablePageW = page.w - MARGIN.left - MARGIN.right;

    const columnStyles = Object.fromEntries(
      section.columns.map((c, i) => [
        i,
        {
          cellWidth: (colWidths[i] / totalPct) * usablePageW,
          halign: c.align ?? inferAlign(c.header)
        }
      ])
    );

    const opts: UserOptions = {
      startY: cursorY,
      margin: { top: MARGIN.top, right: MARGIN.right, bottom: MARGIN.bottom, left: MARGIN.left },
      head,
      body,
      styles: {
        font: 'helvetica',
        fontSize: 9,
        lineColor: brand.tableBorder,
        lineWidth: 0.1,
        cellPadding: { top: 2, right: 2, bottom: 2, left: 2 }
      },
      headStyles: {
        fillColor: brand.tableHeadBg,
        textColor: [0, 0, 0],
        lineColor: brand.tableBorder,
        fontStyle: 'bold'
      },
      bodyStyles: {
        // zebra striping (alternate rows)
        fillColor: [249, 250, 251] // light gray
      },
      columnStyles,
      rowPageBreak: 'avoid',
      pageBreak: 'auto',
      didDrawPage: () => {
        // No header redraw on subsequent pages
      }
    };

    autoTable(doc, opts);
    cursorY = (doc as any).lastAutoTable.finalY + 4;
  }

  function inferAlign(header: string): 'left' | 'center' | 'right' {
    const h = (header || '').toLowerCase();
    if (/(amount|total|balance|revenue|expense|profit|debit|credit|net|\$|usd)/.test(h)) return 'right';
    if (/(date|due|month|status)/.test(h)) return 'center';
    return 'left';
  }

  // ---------- Start rendering ----------
  drawHeader(1);

  // Overview KPIs
  drawKpiGrid('Key Performance Indicators', kpis);

  // Statement (P&L) KPIs
  drawKpiGrid('P&L Summary', statementKpis);

  // Overview Charts
  drawCharts('Trends', charts);

  // Dynamic sections
  for (const s of sections) {
    if (s.kind === 'insights') {
      drawInsights(s);
    } else if (s.kind === 'chart') {
      // optional per-section chart title
      if (s.title) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(s.title, contentX, cursorY);
        cursorY += 5;
      }
      const h = s.height ?? 72;
      ensureSpace(h + 12);
      doc.setDrawColor(...brand.tableBorder);
      doc.roundedRect(contentX, cursorY, contentW, h + 8, 2, 2, 'FD');
      doc.addImage(s.imageDataUrl, 'PNG', contentX + 4, cursorY + 4, contentW - 8, h, undefined, 'FAST');
      cursorY += h + 12;
    } else if (s.kind === 'table') {
      drawTable(s);
    }
  }

  // Footer: Page X of Y
  const pageCount = (doc as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(i, pageCount);
  }

  const safeName = (fileName || `${title}.pdf`).replace(/[^a-z0-9-_\.]+/gi, '_');
  doc.save(safeName);
}
