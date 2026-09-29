import { useMemo } from 'react';

import LabelPrintModal, { LabelItem } from 'ui-component/inventory/modals/LabelPrintModal';

export interface ReceivingLabelItem {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  quantity: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: ReceivingLabelItem[];
}

export default function ReceivingLabelsDialog({ open, onClose, items }: Props) {
  const labelItems = useMemo<LabelItem[]>(
    () =>
      items.map((item) => ({
        id: String(item.id),
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        quantity_on_hand: item.quantity
      })),
    [items]
  );

  return <LabelPrintModal open={open} onClose={onClose} items={labelItems} receivedStock />;
}
