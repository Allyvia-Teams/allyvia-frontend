import Papa from 'papaparse';

export const EXPENSE_FIELDS = [
  'doc_number',
  'vendor_name',
  'amount',
  'bill_date',
  'due_date',
  'line_description',
  'account_name',
  'payment_status',
  'memo',
  'currency_ref'
] as const;

export type ExpenseField = (typeof EXPENSE_FIELDS)[number];

export const REQUIRED_FIELDS: ExpenseField[] = ['vendor_name', 'amount', 'bill_date'];

const emptyFieldMap = (): Record<ExpenseField, string> => ({
  doc_number: '',
  vendor_name: '',
  amount: '',
  bill_date: '',
  due_date: '',
  line_description: '',
  account_name: '',
  payment_status: '',
  memo: '',
  currency_ref: ''
});

export const autoMapFields = (csvHeaders: string[]): Record<ExpenseField, string> => {
  const fieldMap = emptyFieldMap();

  csvHeaders.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim().replace(/\s+/g, '_');

    if (lowerHeader === 'doc_number' || lowerHeader === 'expense_number' || lowerHeader === 'expense_#') {
      fieldMap.doc_number = header;
    } else if (lowerHeader === 'vendor_name' || lowerHeader === 'vendor' || lowerHeader === 'payee') {
      fieldMap.vendor_name = header;
    } else if (lowerHeader === 'amount' || lowerHeader === 'total' || lowerHeader === 'expense_amount') {
      fieldMap.amount = header;
    } else if (lowerHeader === 'bill_date' || lowerHeader === 'expense_date' || lowerHeader === 'date') {
      fieldMap.bill_date = header;
    } else if (lowerHeader === 'due_date' || lowerHeader === 'payment_due') {
      fieldMap.due_date = header;
    } else if (
      lowerHeader === 'line_description' ||
      lowerHeader === 'description' ||
      lowerHeader === 'expense_description'
    ) {
      fieldMap.line_description = header;
    } else if (lowerHeader === 'account_name' || lowerHeader === 'category' || lowerHeader === 'expense_category') {
      fieldMap.account_name = header;
    } else if (lowerHeader === 'payment_status' || lowerHeader === 'status') {
      fieldMap.payment_status = header;
    } else if (lowerHeader === 'memo' || lowerHeader === 'notes') {
      fieldMap.memo = header;
    } else if (lowerHeader === 'currency_ref' || lowerHeader === 'currency') {
      fieldMap.currency_ref = header;
    }
  });

  return fieldMap;
};

export const buildMappedCsv = (csvRows: Record<string, any>[], fieldMap: Record<ExpenseField, string>) => {
  const mappedRows = csvRows.map((row) => {
    const out: Record<string, any> = {};
    EXPENSE_FIELDS.forEach((field) => {
      const source = fieldMap[field];
      if (source) {
        out[field] = row[source];
      }
    });
    return out;
  });

  const csv = Papa.unparse(mappedRows, { header: true });
  const blob = new Blob([csv], { type: 'text/csv' });
  const mappedFile = new File([blob], `backend_expenses_${Date.now()}.csv`, { type: 'text/csv' });
  return { csv, blob, file: mappedFile, mappedRows };
};

export const downloadDemoExpenseCsv = () => {
  const rows = [
    {
      doc_number: 'EXP-001',
      vendor_name: 'Office Supplies Co',
      amount: '250.00',
      bill_date: '2026-01-15',
      due_date: '2026-02-15',
      line_description: 'Printer paper and toner',
      account_name: 'Office Supplies',
      payment_status: 'unpaid',
      memo: 'January supplies',
      currency_ref: 'USD'
    },
    {
      doc_number: 'EXP-002',
      vendor_name: 'Cloud Hosting Inc',
      amount: '99.00',
      bill_date: '2026-01-20',
      due_date: '2026-01-20',
      line_description: 'AWS monthly hosting',
      account_name: 'Software & Subscriptions',
      payment_status: 'paid',
      memo: '',
      currency_ref: 'USD'
    }
  ];

  const fields = [...EXPENSE_FIELDS] as string[];
  const dataMatrix = rows.map((row) => fields.map((f) => (row as any)[f] ?? ''));
  const csv = Papa.unparse({ fields, data: dataMatrix });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expense_demo_data_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const createEmptyExpenseFieldMap = emptyFieldMap;
