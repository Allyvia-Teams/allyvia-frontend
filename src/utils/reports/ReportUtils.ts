// Common report helpers for all modules

export async function loadLogoAsDataUrl(path: string): Promise<string> {
  const res = await fetch(path);
  const blob = await res.blob();
  return await new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result));
    r.readAsDataURL(blob);
  });
}

export const DEFAULT_REPORT_BRAND = {
  headerBg: [15, 23, 42] as [number, number, number],
  headerText: [255, 255, 255] as [number, number, number],
  accent: [59, 130, 246] as [number, number, number],
  tableHeadBg: [226, 232, 240] as [number, number, number],
  tableBorder: [203, 213, 225] as [number, number, number]
};

// Draw a finance-style header band with optional logo
export function drawHeaderBand(args: {
  doc: any;
  pageWidth: number;
  brand: typeof DEFAULT_REPORT_BRAND;
  margins: { top: number; right: number; left: number };
  headerH: number;
  title: string;
  subtitle?: string;
  logoDataUrl?: string;
}) {
  const { doc, pageWidth, brand, margins, headerH, title, subtitle, logoDataUrl } = args;
  doc.setFillColor(...brand.headerBg);
  doc.rect(0, 0, pageWidth, headerH + margins.top, 'F');

  if (logoDataUrl && /^data:image\/(png|jpg|jpeg);base64,/i.test(logoDataUrl)) {
    try {
      const lw = 24,
        lh = 10;
      doc.addImage(logoDataUrl, undefined, margins.left, margins.top - 2, lw, lh, undefined, 'FAST');
    } catch {}
  }

  doc.setTextColor(...brand.headerText);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, pageWidth - margins.right, margins.top + 5, { align: 'right', baseline: 'top' });
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(subtitle, pageWidth - margins.right, margins.top + 11, { align: 'right', baseline: 'top' });
  }
}

// Draw KPI cards grid like finance; returns updated cursorY
export function drawKpiGrid(args: {
  doc: any;
  brand: typeof DEFAULT_REPORT_BRAND;
  title: string;
  cards: Array<{ label: string; value: string | number }>;
  x: number;
  y: number;
  width: number;
  gap?: number;
}): number {
  const { doc, brand, title, cards, x, y, width, gap = 4 } = args;
  if (!cards?.length) return y;
  let cursorY = y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(title, x, cursorY);
  cursorY += 5;

  const COLS = 3;
  const cardW = (width - gap * (COLS - 1)) / COLS;
  const cardH = 26;

  const drawCard = (cx: number, cy: number, k: { label: string; value: string | number }) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...brand.tableBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'FD');
    doc.setDrawColor(...brand.accent);
    doc.setLineWidth(0.8);
    doc.line(cx, cy, cx + cardW, cy);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(String(k.label ?? ''), cx + 4, cy + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(0);
    doc.text(String(k.value ?? ''), cx + 4, cy + 16);
    doc.setTextColor(0);
  };

  for (let i = 0; i < cards.length; i += COLS) {
    const row = cards.slice(i, i + COLS);
    let cx = x;
    row.forEach((k) => {
      drawCard(cx, cursorY, k);
      cx += cardW + gap;
    });
    cursorY += cardH + gap;
  }
  cursorY += 2;
  return cursorY;
}
