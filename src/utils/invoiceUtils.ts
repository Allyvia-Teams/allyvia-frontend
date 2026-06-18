import Papa from 'papaparse';

export const INVOICE_FIELDS = [
  'doc_number',
  'customer_name',
  'total_amount',
  'invoice_date',
  'due_date',
  'line_description',
  'item_name',
  'quantity',
  'unit_price',
  'payment_status',
  'currency',
  'bill_email',
  'private_note'
] as const;

export type InvoiceField = (typeof INVOICE_FIELDS)[number];

export const REQUIRED_FIELDS: InvoiceField[] = ['customer_name', 'total_amount', 'invoice_date'];

const emptyFieldMap = (): Record<InvoiceField, string> => ({
  doc_number: '',
  customer_name: '',
  total_amount: '',
  invoice_date: '',
  due_date: '',
  line_description: '',
  item_name: '',
  quantity: '',
  unit_price: '',
  payment_status: '',
  currency: '',
  bill_email: '',
  private_note: ''
});

export const autoMapFields = (csvHeaders: string[]): Record<InvoiceField, string> => {
  const fieldMap = emptyFieldMap();

  csvHeaders.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim().replace(/\s+/g, '_');

    if (lowerHeader === 'doc_number' || lowerHeader === 'invoice_number' || lowerHeader === 'invoice_#') {
      fieldMap.doc_number = header;
    } else if (lowerHeader === 'customer_name' || lowerHeader === 'customer') {
      fieldMap.customer_name = header;
    } else if (lowerHeader === 'total_amount' || lowerHeader === 'amount' || lowerHeader === 'total') {
      fieldMap.total_amount = header;
    } else if (lowerHeader === 'invoice_date' || lowerHeader === 'date') {
      fieldMap.invoice_date = header;
    } else if (lowerHeader === 'due_date') {
      fieldMap.due_date = header;
    } else if (lowerHeader === 'line_description' || lowerHeader === 'description') {
      fieldMap.line_description = header;
    } else if (lowerHeader === 'item_name' || lowerHeader === 'item') {
      fieldMap.item_name = header;
    } else if (lowerHeader === 'quantity' || lowerHeader === 'qty') {
      fieldMap.quantity = header;
    } else if (lowerHeader === 'unit_price' || lowerHeader === 'price') {
      fieldMap.unit_price = header;
    } else if (lowerHeader === 'payment_status' || lowerHeader === 'status') {
      fieldMap.payment_status = header;
    } else if (lowerHeader === 'currency' || lowerHeader === 'currency_ref') {
      fieldMap.currency = header;
    } else if (lowerHeader === 'bill_email' || lowerHeader === 'email') {
      fieldMap.bill_email = header;
    } else if (lowerHeader === 'private_note' || lowerHeader === 'memo' || lowerHeader === 'notes') {
      fieldMap.private_note = header;
    }
  });

  return fieldMap;
};

export const buildMappedCsv = (csvRows: Record<string, any>[], fieldMap: Record<InvoiceField, string>) => {
  const mappedRows = csvRows.map((row) => {
    const out: Record<string, any> = {};
    INVOICE_FIELDS.forEach((field) => {
      const source = fieldMap[field];
      if (source) out[field] = row[source];
    });
    return out;
  });

  const csv = Papa.unparse(mappedRows, { header: true });
  const blob = new Blob([csv], { type: 'text/csv' });
  const mappedFile = new File([blob], `backend_invoices_${Date.now()}.csv`, { type: 'text/csv' });
  return { csv, blob, file: mappedFile, mappedRows };
};

export const downloadDemoInvoiceCsv = () => {
  const rows = [
    {
      doc_number: 'INV-001',
      customer_name: 'Acme Corp',
      total_amount: '1500.00',
      invoice_date: '2026-01-10',
      due_date: '2026-02-10',
      line_description: 'Consulting services',
      item_name: 'Professional Services',
      quantity: '1',
      unit_price: '1500.00',
      payment_status: 'unpaid',
      currency: 'USD',
      bill_email: 'billing@acme.com',
      private_note: 'January consulting'
    },
    {
      doc_number: 'INV-002',
      customer_name: 'Beta LLC',
      total_amount: '750.00',
      invoice_date: '2026-01-15',
      due_date: '2026-01-15',
      line_description: 'Software license',
      item_name: 'Software License',
      quantity: '1',
      unit_price: '750.00',
      payment_status: 'paid',
      currency: 'USD',
      bill_email: '',
      private_note: ''
    }
  ];

  const fields = [...INVOICE_FIELDS] as string[];
  const dataMatrix = rows.map((row) => fields.map((f) => (row as any)[f] ?? ''));
  const csv = Papa.unparse({ fields, data: dataMatrix });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice_demo_data_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const createEmptyInvoiceFieldMap = emptyFieldMap;
