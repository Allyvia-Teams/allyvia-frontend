// src/utils/financePdfReports.ts
// Pixel-perfect PDF builder for Finance reports using jsPDF + jspdf-autotable

import jsPDF from 'jspdf';
import autoTable, { RowInput, UserOptions } from 'jspdf-autotable';

// ---------- Types ----------
import type {
  FinanceKPIsData,
  ProfitAndLossData,
  ExpenseStatsData,
  PaymentSummaryData,
  InvoiceAgingData,
  RevenueSeriesData,
  ExpenseBreakdownData,
  PaymentSplitData
} from 'types/finance';

// PDF-specific types
export interface RGB extends Array<number> {
  0: number;
  1: number;
  2: number;
  length: 3;
}

export interface PDFKPI {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: RGB;
}

export interface TableCol {
  header: string;
  dataKey: string;
  widthPct?: number;
  align?: 'left' | 'center' | 'right';
}

export interface TableSection {
  kind: 'table';
  title: string;
  columns: TableCol[];
  rows: Record<string, any>[];
}

export interface InsightsSection {
  kind: 'insights';
  title: string;
  bullets: string[];
}

export interface ChartSection {
  kind: 'chart';
  title?: string;
  imageDataUrl: string;
  height?: number;
}

export type Section = TableSection | InsightsSection | ChartSection;

export interface Brand {
  headerBg: RGB;
  headerText: RGB;
  accent: RGB;
  panelBg: RGB;
  tableHeadBg: RGB;
  tableBorder: RGB;
}

export interface BuildReportParams {
  title: string;
  subtitle?: string;
  duration?: string;
  logoDataUrl?: string;
  brand?: Partial<Brand>;
  kpis?: PDFKPI[];
  statementKpis?: PDFKPI[];
  charts?: string[];
  sections?: Section[];
  fileName?: string;
}

// Alias for backward compatibility
export type KPI = PDFKPI;

// ---------- Defaults ----------
const DEFAULT_BRAND: Brand = {
  headerBg: [15, 23, 42], // slate-900
  headerText: [255, 255, 255], // white
  accent: [59, 130, 246], // blue-500
  panelBg: [241, 245, 249], // slate-100
  tableHeadBg: [226, 232, 240], // slate-200
  tableBorder: [203, 213, 225] // slate-300
};

// ---------- Data Transformation Utilities ----------

/**
 * Transform Finance KPIs data to PDF format
 */
export function transformFinanceKPIsToPDF(financeKPIs: FinanceKPIsData): PDFKPI[] {
  const { summary, kpis, ratios } = financeKPIs;

  return [
    {
      label: 'Total Revenue',
      value: formatCurrency(kpis.revenue),
      sublabel: `${summary.payments_count} payments`,
      trend: 'up'
    },
    {
      label: 'Net Income',
      value: formatCurrency(kpis.net_income),
      sublabel: `${ratios.net_profit_margin.toFixed(1)}% margin`,
      trend: kpis.net_income >= 0 ? 'up' : 'down'
    },
    {
      label: 'Gross Profit',
      value: formatCurrency(kpis.gross_profit),
      sublabel: `${ratios.gross_profit_margin.toFixed(1)}% margin`,
      trend: 'up'
    },
    {
      label: 'Cash Balance',
      value: formatCurrency(kpis.cash_balance),
      sublabel: 'Available funds',
      trend: 'neutral'
    },
    {
      label: 'A/R Outstanding',
      value: formatCurrency(kpis.accounts_receivable_outstanding),
      sublabel: 'Pending receivables',
      trend: 'neutral'
    },
    {
      label: 'Working Capital',
      value: formatCurrency(kpis.working_capital),
      sublabel: 'Current assets - liabilities',
      trend: kpis.working_capital >= 0 ? 'up' : 'down'
    }
  ];
}

/**
 * Transform Expense Stats to PDF format
 */
export function transformExpenseStatsToPDF(expenseStats: ExpenseStatsData): PDFKPI[] {
  return [
    {
      label: 'Total Expenses',
      value: formatCurrency(parseFloat(expenseStats.total_expenses)),
      sublabel: `${expenseStats.expense_count} transactions`,
      trend: 'down'
    },
    {
      label: 'Average Expense',
      value: formatCurrency(parseFloat(expenseStats.average_expense)),
      sublabel: 'Per transaction',
      trend: 'neutral'
    },
    {
      label: 'Top Category',
      value: expenseStats.top_category,
      sublabel: 'Highest spending category',
      trend: 'neutral'
    },
    {
      label: 'Period',
      value: expenseStats.period,
      sublabel: 'Reporting period',
      trend: 'neutral'
    }
  ];
}

/**
 * Transform Payment Summary to PDF format
 */
export function transformPaymentSummaryToPDF(paymentSummary: PaymentSummaryData): PDFKPI[] {
  return [
    {
      label: 'Total Payments',
      value: formatCurrency(paymentSummary.total_payments),
      sublabel: `${paymentSummary.payment_count} transactions`,
      trend: 'up'
    },
    {
      label: 'Payment Count',
      value: paymentSummary.payment_count,
      sublabel: 'Total transactions',
      trend: 'up'
    },
    {
      label: 'Period',
      value: `${paymentSummary.period.start_date} to ${paymentSummary.period.end_date}`,
      sublabel: 'Reporting period',
      trend: 'neutral'
    }
  ];
}

/**
 * Transform Invoice Statistics to PDF format
 */
export function transformInvoiceStatsToPDF(invoiceStats: any): PDFKPI[] {
  return [
    {
      label: 'Total Invoices',
      value: invoiceStats.total_invoices || 0,
      sublabel: 'Issued invoices',
      trend: 'up'
    },
    {
      label: 'Total Amount',
      value: formatCurrency(parseFloat(invoiceStats.total_amount || '0')),
      sublabel: 'Invoice value',
      trend: 'up'
    },
    {
      label: 'Outstanding',
      value: formatCurrency(parseFloat(invoiceStats.outstanding_balance || '0')),
      sublabel: 'Unpaid invoices',
      trend: 'down'
    },
    {
      label: 'Overdue',
      value: invoiceStats.overdue_count || 0,
      sublabel: 'Past due invoices',
      trend: 'down'
    }
  ];
}

/**
 * Create expense breakdown table for PDF
 */
export function createExpenseBreakdownTable(expenseBreakdown: ExpenseBreakdownData): TableSection {
  return {
    kind: 'table',
    title: 'Expense Breakdown by Category',
    columns: [
      { header: 'Category', dataKey: 'category', widthPct: 40 },
      { header: 'Amount', dataKey: 'amount', widthPct: 25, align: 'right' },
      { header: 'Count', dataKey: 'count', widthPct: 15, align: 'center' },
      { header: 'Percentage', dataKey: 'percentage', widthPct: 20, align: 'right' }
    ],
    rows: expenseBreakdown.by_category.map((item) => ({
      category: item.category_name,
      amount: formatCurrency(parseFloat(item.total)),
      count: item.count,
      percentage: `${item.percentage.toFixed(1)}%`
    }))
  };
}

/**
 * Create payment methods table for PDF
 */
export function createPaymentMethodsTable(paymentSplit: PaymentSplitData): TableSection {
  return {
    kind: 'table',
    title: 'Payment Methods Distribution',
    columns: [
      { header: 'Method', dataKey: 'method', widthPct: 40 },
      { header: 'Amount', dataKey: 'amount', widthPct: 25, align: 'right' },
      { header: 'Count', dataKey: 'count', widthPct: 15, align: 'center' },
      { header: 'Percentage', dataKey: 'percentage', widthPct: 20, align: 'right' }
    ],
    rows: paymentSplit.payment_methods.map((item) => ({
      method: item.provider,
      amount: formatCurrency(parseFloat(item.amount)),
      count: item.count,
      percentage: `${((item.count / paymentSplit.payment_methods.reduce((sum, p) => sum + p.count, 0)) * 100).toFixed(1)}%`
    }))
  };
}

/**
 * Create invoice aging table for PDF
 */
export function createInvoiceAgingTable(invoiceAging: InvoiceAgingData): TableSection {
  return {
    kind: 'table',
    title: 'Invoice Aging Analysis',
    columns: [
      { header: 'Period', dataKey: 'period', widthPct: 30 },
      { header: 'Count', dataKey: 'count', widthPct: 20, align: 'center' },
      { header: 'Amount', dataKey: 'amount', widthPct: 30, align: 'right' },
      { header: 'Percentage', dataKey: 'percentage', widthPct: 20, align: 'right' }
    ],
    rows: [
      {
        period: 'Current (0-30 days)',
        count: invoiceAging.aging_summary.current,
        amount: formatCurrency(invoiceAging.aging_summary.current),
        percentage: `${((invoiceAging.aging_summary.current / invoiceAging.aging_summary.total) * 100).toFixed(1)}%`
      },
      {
        period: '31-60 days',
        count: invoiceAging.aging_summary.days_31_60,
        amount: formatCurrency(invoiceAging.aging_summary.days_31_60),
        percentage: `${((invoiceAging.aging_summary.days_31_60 / invoiceAging.aging_summary.total) * 100).toFixed(1)}%`
      },
      {
        period: '61-90 days',
        count: invoiceAging.aging_summary.days_61_90,
        amount: formatCurrency(invoiceAging.aging_summary.days_61_90),
        percentage: `${((invoiceAging.aging_summary.days_61_90 / invoiceAging.aging_summary.total) * 100).toFixed(1)}%`
      },
      {
        period: 'Over 90 days',
        count: invoiceAging.aging_summary.over_90,
        amount: formatCurrency(invoiceAging.aging_summary.over_90),
        percentage: `${((invoiceAging.aging_summary.over_90 / invoiceAging.aging_summary.total) * 100).toFixed(1)}%`
      }
    ]
  };
}

/**
 * Format currency values consistently
 */
function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(numValue || 0);
}

// ---------- Public: load logo as Data URL ----------
export { loadLogoAsDataUrl } from '../ReportUtils';

/**
 * Build a comprehensive finance report from new API data
 */
export async function buildComprehensiveFinanceReport(params: {
  title: string;
  subtitle?: string;
  duration: string;
  logoDataUrl?: string;
  brand?: Partial<Brand>;
  fileName?: string;
  // New API data
  financeKPIs?: FinanceKPIsData;
  profitAndLoss?: ProfitAndLossData;
  expenseStats?: ExpenseStatsData;
  expenseBreakdown?: ExpenseBreakdownData;
  paymentSummary?: PaymentSummaryData;
  paymentSplit?: PaymentSplitData;
  invoiceStats?: any;
  invoiceAging?: InvoiceAgingData;
  revenueSeries?: RevenueSeriesData;
  // Chart images (base64 data URLs)
  charts?: string[];
}): Promise<void> {
  const {
    title,
    subtitle,
    duration,
    logoDataUrl,
    brand,
    fileName,
    financeKPIs,
    profitAndLoss,
    expenseStats,
    expenseBreakdown,
    paymentSummary,
    paymentSplit,
    invoiceStats,
    invoiceAging,
    charts = []
  } = params;

  // Transform API data to PDF format
  const kpis: PDFKPI[] = [];
  const statementKpis: PDFKPI[] = [];
  const sections: Section[] = [];

  // Add main finance KPIs
  if (financeKPIs) {
    kpis.push(...transformFinanceKPIsToPDF(financeKPIs));
  }

  // Add profit & loss KPIs
  if (profitAndLoss) {
    statementKpis.push(
      {
        label: 'Total Income',
        value: formatCurrency(profitAndLoss.total_income),
        sublabel: 'Gross revenue',
        trend: 'up'
      },
      {
        label: 'Total Expenses',
        value: formatCurrency(profitAndLoss.total_expenses),
        sublabel: 'Operating costs',
        trend: 'down'
      },
      {
        label: 'Gross Profit',
        value: formatCurrency(profitAndLoss.gross_profit),
        sublabel: 'Before operating expenses',
        trend: 'up'
      },
      {
        label: 'Net Income',
        value: formatCurrency(profitAndLoss.net_income),
        sublabel: 'Final profit/loss',
        trend: profitAndLoss.net_income >= 0 ? 'up' : 'down'
      }
    );
  }

  // Add expense analysis
  if (expenseStats) {
    statementKpis.push(...transformExpenseStatsToPDF(expenseStats));
  }

  // Add payment analysis
  if (paymentSummary) {
    statementKpis.push(...transformPaymentSummaryToPDF(paymentSummary));
  }

  // Add invoice analysis
  if (invoiceStats) {
    statementKpis.push(...transformInvoiceStatsToPDF(invoiceStats));
  }

  // Add tables
  if (expenseBreakdown) {
    sections.push(createExpenseBreakdownTable(expenseBreakdown));
  }

  if (paymentSplit) {
    sections.push(createPaymentMethodsTable(paymentSplit));
  }

  if (invoiceAging) {
    sections.push(createInvoiceAgingTable(invoiceAging));
  }

  // Add insights section
  const insights: string[] = [];
  if (financeKPIs) {
    insights.push(`Revenue increased by ${financeKPIs.summary.payments_count} transactions`);
    insights.push(`Net profit margin: ${financeKPIs.ratios.net_profit_margin.toFixed(1)}%`);
    insights.push(`Current ratio: ${financeKPIs.ratios.current_ratio.toFixed(2)}`);
  }
  if (expenseStats) {
    insights.push(`Average expense per transaction: ${formatCurrency(parseFloat(expenseStats.average_expense))}`);
  }
  if (paymentSummary) {
    insights.push(`Total payments: ${paymentSummary.payment_count} transactions`);
  }

  if (insights.length > 0) {
    sections.push({
      kind: 'insights',
      title: 'Key Insights',
      bullets: insights
    });
  }

  // Build the report
  await buildFinancePdfReport({
    title,
    subtitle,
    duration,
    logoDataUrl,
    brand,
    fileName: fileName || `${title.replace(/\s+/g, '_')}_${duration.replace(/\s+/g, '_')}.pdf`,
    kpis,
    statementKpis,
    charts,
    sections
  });
}

// ---------- Public: main builder ----------
export async function buildFinancePdfReport(params: BuildReportParams): Promise<void> {
  const {
    title,
    subtitle,
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

  function drawHeader(pageIndex: number) {
    // Header band
    doc.setFillColor(brand.headerBg[0], brand.headerBg[1], brand.headerBg[2]);
    doc.rect(0, 0, page.w, HEADER_H + MARGIN.top, 'F');

    // Logo top-left
    if (logoDataUrl) {
      const lw = 10,
        lh = 10;
      doc.addImage(logoDataUrl, 'PNG', MARGIN.left, MARGIN.top - 2, lw, lh, undefined, 'FAST');
    }

    // Title & subtitle top-right
    doc.setTextColor(brand.headerText[0], brand.headerText[1], brand.headerText[2]);
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
      doc.setDrawColor(brand.tableBorder[0], brand.tableBorder[1], brand.tableBorder[2]);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
      // accent line on top
      doc.setDrawColor(brand.accent[0], brand.accent[1], brand.accent[2]);
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
      doc.setDrawColor(brand.tableBorder[0], brand.tableBorder[1], brand.tableBorder[2]);
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
        lineColor: [brand.tableBorder[0], brand.tableBorder[1], brand.tableBorder[2]],
        lineWidth: 0.1,
        cellPadding: { top: 2, right: 2, bottom: 2, left: 2 }
      },
      headStyles: {
        fillColor: [brand.tableHeadBg[0], brand.tableHeadBg[1], brand.tableHeadBg[2]],
        textColor: [0, 0, 0],
        lineColor: [brand.tableBorder[0], brand.tableBorder[1], brand.tableBorder[2]],
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
      doc.setDrawColor(brand.tableBorder[0], brand.tableBorder[1], brand.tableBorder[2]);
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
