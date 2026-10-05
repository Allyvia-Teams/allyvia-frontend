import jsPDF from 'jspdf';

export interface LabelLayout {
  name: string;
  kind: 'thermal' | 'avery';
  width: number;
  height: number;
}

export const LABEL_LAYOUTS: LabelLayout[] = [
  { name: 'Thermal 2¼ × 1¼ in', kind: 'thermal', width: 162, height: 90 },
  { name: 'Thermal 2 × 1 in', kind: 'thermal', width: 144, height: 72 },
  { name: 'Avery 5160 · 30 per letter sheet', kind: 'avery', width: 189, height: 72 }
];

export interface PrintableInventoryLabel {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  quantity: number;
  barcodePng: string;
}

const fitText = (doc: jsPDF, value: string, width: number): string => {
  if (doc.getTextWidth(value) <= width) return value;
  let text = value;
  while (text.length && doc.getTextWidth(`${text}…`) > width) text = text.slice(0, -1);
  return `${text}…`;
};

const drawLabel = (doc: jsPDF, item: PrintableInventoryLabel, x: number, y: number, width: number, height: number, alias: string) => {
  const center = x + width / 2;
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(fitText(doc, item.name, width - 14), center, y + 11, { align: 'center' });

  const imageHeight = Math.max(19, height - 43);
  doc.addImage(item.barcodePng, 'PNG', x + 8, y + 17, width - 16, imageHeight, alias, 'FAST');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(fitText(doc, item.barcode, width - 12), center, y + height - 14, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(fitText(doc, `SKU ${item.sku}`, width - 12), center, y + height - 5, { align: 'center' });
};

/** Build a PDF using the barcodes already rendered in the browser. No label API is required. */
export function buildInventoryLabelPdf(items: PrintableInventoryLabel[], layout: LabelLayout, startOffset = 0): jsPDF {
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  if (!Number.isSafeInteger(total) || total < 1 || total > 500) throw new Error('Choose between 1 and 500 labels to print.');
  if (items.some((item) => !item.barcode || !item.barcodePng || !Number.isSafeInteger(item.quantity) || item.quantity < 0)) {
    throw new Error('Every selected label needs a barcode and a valid quantity.');
  }
  if (layout.kind === 'avery' && (!Number.isInteger(startOffset) || startOffset < 0 || startOffset > 29)) {
    throw new Error('The Avery starting cell must be between 1 and 30.');
  }

  const isSheet = layout.kind === 'avery';
  const pageSize: [number, number] = isSheet ? [612, 792] : [layout.width, layout.height];
  const orientation = isSheet ? 'portrait' : 'landscape';
  const doc = new jsPDF({ unit: 'pt', format: pageSize, orientation, compress: true });
  let labelIndex = 0;

  items.forEach((item, itemIndex) => {
    for (let copy = 0; copy < item.quantity; copy += 1) {
      if (isSheet) {
        const cell = startOffset + labelIndex;
        const page = Math.floor(cell / 30);
        while (doc.internal.getNumberOfPages() <= page) doc.addPage(pageSize, orientation);
        doc.setPage(page + 1);
        const position = cell % 30;
        const column = position % 3;
        const row = Math.floor(position / 3);
        drawLabel(doc, item, 13.5 + column * 198, 36 + row * 72, layout.width, layout.height, `barcode-${itemIndex}`);
      } else {
        if (labelIndex > 0) doc.addPage(pageSize, orientation);
        drawLabel(doc, item, 0, 0, layout.width, layout.height, `barcode-${itemIndex}`);
      }
      labelIndex += 1;
    }
  });

  return doc;
}
