import Papa from 'papaparse';

export const PAYMENT_FIELDS = [
  'reference_number',
  'customer_name',
  'amount',
  'payment_date',
  'payment_method',
  'invoice_doc_number',
  'applied_amount',
  'currency_ref',
  'private_note'
] as const;

export type PaymentField = (typeof PAYMENT_FIELDS)[number];

export const REQUIRED_FIELDS: PaymentField[] = ['customer_name', 'amount', 'payment_date'];

const emptyFieldMap = (): Record<PaymentField, string> => ({
  reference_number: '',
  customer_name: '',
  amount: '',
  payment_date: '',
  payment_method: '',
  invoice_doc_number: '',
  applied_amount: '',
  currency_ref: '',
  private_note: ''
});

export const autoMapFields = (csvHeaders: string[]): Record<PaymentField, string> => {
  const fieldMap = emptyFieldMap();

  csvHeaders.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim().replace(/\s+/g, '_');

    if (lowerHeader === 'reference_number' || lowerHeader === 'payment_ref' || lowerHeader === 'ref_number') {
      fieldMap.reference_number = header;
    } else if (lowerHeader === 'customer_name' || lowerHeader === 'customer') {
      fieldMap.customer_name = header;
    } else if (lowerHeader === 'amount' || lowerHeader === 'payment_amount') {
      fieldMap.amount = header;
    } else if (lowerHeader === 'payment_date' || lowerHeader === 'date') {
      fieldMap.payment_date = header;
    } else if (lowerHeader === 'payment_method' || lowerHeader === 'method') {
      fieldMap.payment_method = header;
    } else if (lowerHeader === 'invoice_doc_number' || lowerHeader === 'invoice_number' || lowerHeader === 'invoice') {
      fieldMap.invoice_doc_number = header;
    } else if (lowerHeader === 'applied_amount') {
      fieldMap.applied_amount = header;
    } else if (lowerHeader === 'currency_ref' || lowerHeader === 'currency') {
      fieldMap.currency_ref = header;
    } else if (lowerHeader === 'private_note' || lowerHeader === 'memo' || lowerHeader === 'notes') {
      fieldMap.private_note = header;
    }
  });

  return fieldMap;
};

export const buildMappedCsv = (csvRows: Record<string, any>[], fieldMap: Record<PaymentField, string>) => {
  const mappedRows = csvRows.map((row) => {
    const out: Record<string, any> = {};
    PAYMENT_FIELDS.forEach((field) => {
      const source = fieldMap[field];
      if (source) out[field] = row[source];
    });
    return out;
  });

  const csv = Papa.unparse(mappedRows, { header: true });
  const blob = new Blob([csv], { type: 'text/csv' });
  const mappedFile = new File([blob], `backend_payments_${Date.now()}.csv`, { type: 'text/csv' });
  return { csv, blob, file: mappedFile, mappedRows };
};

export const downloadDemoPaymentCsv = () => {
  const rows = [
    {
      reference_number: 'PMT-001',
      customer_name: 'Acme Corp',
      amount: '1500.00',
      payment_date: '2026-02-01',
      payment_method: 'Check',
      invoice_doc_number: 'INV-001',
      applied_amount: '1500.00',
      currency_ref: 'USD',
      private_note: 'Payment for January invoice'
    },
    {
      reference_number: 'PMT-002',
      customer_name: 'Beta LLC',
      amount: '250.00',
      payment_date: '2026-02-05',
      payment_method: 'Cash',
      invoice_doc_number: '',
      applied_amount: '250.00',
      currency_ref: 'USD',
      private_note: ''
    }
  ];

  const fields = [...PAYMENT_FIELDS] as string[];
  const dataMatrix = rows.map((row) => fields.map((f) => (row as any)[f] ?? ''));
  const csv = Papa.unparse({ fields, data: dataMatrix });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payment_demo_data_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const createEmptyPaymentFieldMap = emptyFieldMap;
