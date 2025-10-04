export interface StatCard {
  label: string;
  calc: 'count' | 'sum' | 'avg' | 'max' | 'min';
  field?: string;
  filter?: Record<string, any>;
  display?: string;
}

export interface FilterConfig {
  type: 'text' | 'select' | 'dateRange' | 'lookup' | 'range' | 'boolean';
  field?: string;
  options?: readonly string[];
  fields?: readonly string[];
  buckets?: readonly number[];
  dynamic?: boolean;
}

export interface ColumnConfig {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

export interface EntityConfig {
  name: string;
  endpoint: string;
  syncEndpoint: string;
  displayField: string;
  idField: string;
  filters: Record<string, FilterConfig>;
  statCards: readonly StatCard[];
  columns: readonly ColumnConfig[];
  searchFields?: readonly string[];
  defaultSort?: string;
  suggestionsEndpoint?: string;
  statsEndpoint?: string;
  detailDrawer?: string;
}

export type EntityType = keyof typeof qbEntityConfigs;

export const qbEntityConfigs = {
  bill: {
    name: 'Bill',
    endpoint: '/expense/bills',
    syncEndpoint: '/qb/bills/sync',
    displayField: 'vendor_name',
    idField: 'id',
    filters: {
      dateRange: { type: 'dateRange', field: 'bill_date' },
      status: { type: 'select', options: ['paid', 'unpaid', 'overdue'] },
      due: { type: 'select', field: 'due_date', options: ['today', 'this_week', 'this_month'] },
      amount: { type: 'range', field: 'amount', buckets: [1000, 5000, 10000] },
      search: { type: 'text', fields: ['vendor_name', 'doc_number', 'memo'] }
    },
    statCards: [
      { label: 'Total Bills', calc: 'count' },
      { label: 'Unpaid', calc: 'count', filter: { status: 'unpaid' } },
      { label: 'Overdue', calc: 'count', filter: { status: 'overdue' } },
      { label: 'Paid', calc: 'count', filter: { status: 'paid' } }
    ],
    columns: [
      { id: 'vendor_name', label: 'Vendor', minWidth: 200 },
      { id: 'doc_number', label: 'Bill #', minWidth: 120 },
      { id: 'bill_date', label: 'Date', minWidth: 100 },
      { id: 'due_date', label: 'Due Date', minWidth: 100 },
      { id: 'amount', label: 'Amount', minWidth: 100 },
      { id: 'balance', label: 'Balance', minWidth: 100 },
      { id: 'status', label: 'Status', align: 'center', minWidth: 100 }
    ],
    searchFields: ['vendor_name', 'doc_number', 'memo', 'private_note'],
    defaultSort: '-bill_date',
    suggestionsEndpoint: '/expense/bills/suggestions',
    statsEndpoint: '/expense/bills/stats/',
    detailDrawer: 'BillDetailDrawer'
  },

  customer: {
    name: 'Customer',
    endpoint: '/customers',
    syncEndpoint: '/qb/customers/sync',
    statsEndpoint: '/customers/stats/',
    suggestionsEndpoint: '/customers/suggestions',
    displayField: 'display_name',
    idField: 'id',
    detailDrawer: 'CustomerDetailDrawer',
    filters: {
      status: { type: 'select', options: ['active', 'inactive'] },
      balance: { type: 'select', options: ['has_balance', 'zero', 'credit'] },
      search: { type: 'text', fields: ['display_name', 'primary_email', 'primary_phone', 'billing_address_state'] }
    },
    statCards: [
      { label: 'Total Customers', calc: 'count', filter: { active: true } },
      { label: 'Total Outstanding', calc: 'sum', field: 'balance' },
      { label: 'Average Balance', calc: 'avg', field: 'balance' },
      { label: 'With Balance', calc: 'count', filter: { balance: { gt: 0 } } }
    ],
    columns: [
      { id: 'display_name', label: 'Customer Name', minWidth: 200 },
      { id: 'primary_email', label: 'Email', minWidth: 180 },
      { id: 'primary_phone', label: 'Phone', minWidth: 150 },
      { id: 'balance', label: 'Balance', minWidth: 100 },
      { id: 'billing_address_state', label: 'State', minWidth: 80 },
      { id: 'status', label: 'Status', align: 'center', minWidth: 100 }
    ],
    searchFields: ['display_name', 'primary_email', 'primary_phone', 'billing_address_state'],
    defaultSort: 'display_name'
  },

  vendor: {
    name: 'Vendor',
    endpoint: '/vendors',
    syncEndpoint: '/qb/vendors/sync',
    statsEndpoint: '/vendors/stats/',
    suggestionsEndpoint: '/vendors/suggestions/',
    displayField: 'display_name',
    idField: 'id',
    detailDrawer: 'VendorDetailDrawer',
    filters: {
      status: { type: 'select', options: ['active', 'inactive'] },
      balance: { type: 'select', options: ['we_owe', 'owes_us', 'zero'] },
      is1099: { type: 'select', field: 'vendor_1099', options: ['true', 'false'] },
      search: { type: 'text', fields: ['display_name', 'primary_email', 'billing_address_state'] }
    },
    statCards: [
      { label: 'Total Vendors', calc: 'count', filter: { active: true } },
      { label: 'Total Payable', calc: 'sum', field: 'balance' },
      { label: 'With Balance', calc: 'count', filter: { balance: { gt: 0 } } },
      { label: 'Average Balance', calc: 'avg', field: 'balance' }
    ],
    columns: [
      { id: 'display_name', label: 'Vendor Name', minWidth: 200 },
      { id: 'primary_email', label: 'Email', minWidth: 180 },
      { id: 'primary_phone', label: 'Phone', minWidth: 150 },
      { id: 'balance', label: 'Balance', minWidth: 100 },
      { id: 'vendor_1099', label: '1099', align: 'center', minWidth: 60 },
      { id: 'billing_address_state', label: 'State', minWidth: 80 }
    ],
    searchFields: ['display_name', 'primary_email', 'company_name', 'billing_address_state'],
    defaultSort: 'display_name'
  },

  invoice: {
    name: 'Invoice',
    endpoint: '/invoice',
    syncEndpoint: '/qb/invoices/sync',
    statsEndpoint: '/invoice/stats/',
    suggestionsEndpoint: '/invoice/suggestions/',
    displayField: 'customer_name',
    idField: 'id',
    detailDrawer: 'InvoiceDetailDrawer',
    filters: {
      status: { type: 'select', options: ['paid', 'unpaid', 'overdue'] },
      dateRange: { type: 'dateRange', field: 'date' },
      amountRange: { type: 'select', options: ['0-1000', '1000-5000', '5000+'] },
      search: { type: 'text', fields: ['customer_name', 'doc_number'] }
    },
    statCards: [
      { label: 'Total Invoices', calc: 'count' },
      { label: 'Unpaid', calc: 'count', filter: { status: 'unpaid' } },
      { label: 'Overdue', calc: 'count', filter: { status: 'overdue' } },
      { label: 'Paid', calc: 'count', filter: { status: 'paid' } }
    ],
    columns: [
      { id: 'doc_number', label: 'Invoice #', minWidth: 120 },
      { id: 'customer_name', label: 'Customer', minWidth: 200 },
      { id: 'date', label: 'Date', minWidth: 100 },
      { id: 'due_date', label: 'Due Date', minWidth: 100 },
      { id: 'total_amount', label: 'Amount', minWidth: 100 },
      { id: 'balance', label: 'Balance', minWidth: 100 },
      { id: 'status', label: 'Status', align: 'center', minWidth: 100 }
    ],
    searchFields: ['doc_number', 'customer_name'],
    defaultSort: '-date'
  },

  payment: {
    name: 'Payment',
    endpoint: '/payment',
    syncEndpoint: '/qb/payments/sync',
    statsEndpoint: '/payment/stats/',
    suggestionsEndpoint: '/payment/suggestions/',
    displayField: 'reference_number',
    idField: 'id',
    detailDrawer: 'PaymentDetailDrawer',
    filters: {
      dateRange: { type: 'dateRange', field: 'payment_date' },
      paymentMethod: { type: 'select', field: 'payment_method', options: ['Cash', 'Check', 'Card', 'Bank Transfer'] },
      customer: { type: 'text', fields: ['customer_name'] },
      appliedStatus: { type: 'select', field: 'applied_status', options: ['fully_applied', 'has_unapplied'] },
      amountRange: { type: 'select', field: 'amount', options: ['0-1000', '1000-5000', '5000-10000', '10000+'] },
      search: { type: 'text', fields: ['reference_number', 'customer_name'] }
    },
    statCards: [
      { label: 'Total Payments', calc: 'count' },
      { label: 'Total Received', calc: 'sum', field: 'amount' },
      { label: 'Unapplied Total', calc: 'sum', field: 'unapplied_amount' },
      { label: 'Average Payment', calc: 'avg', field: 'amount' },
      { label: "Today's Payments", calc: 'count', filter: { payment_date: 'today' } }
    ],
    columns: [
      { id: 'reference_number', label: 'Ref #', minWidth: 120 },
      { id: 'customer_name', label: 'Customer', minWidth: 200 },
      { id: 'payment_date', label: 'Date', minWidth: 100 },
      { id: 'payment_method', label: 'Method', minWidth: 120 },
      { id: 'amount', label: 'Amount', minWidth: 100 },
      { id: 'unapplied_amount', label: 'Unapplied', minWidth: 100 }
    ],
    searchFields: ['reference_number', 'customer_name'],
    defaultSort: '-payment_date'
  },

  billpayment: {
    name: 'Bill Payment',
    endpoint: '/billpayments',
    syncEndpoint: '/qb/billpayments/sync',
    statsEndpoint: '/billpayments/stats/',
    suggestionsEndpoint: '/billpayments/suggestions/',
    displayField: 'vendor_ref_name',
    idField: 'id',
    detailDrawer: 'BillPaymentDetailDrawer',
    filters: {
      dateRange: { type: 'dateRange', field: 'payment_date' },
      paymentType: {
        type: 'select',
        field: 'payment_type',
        options: ['Check', 'CreditCard', 'Cash', 'ACHTransfer', 'Other']
      },
      vendor: { type: 'text', fields: ['vendor_ref_name'] },
      bankAccount: { type: 'select', field: 'bank_account_ref_id', dynamic: true },
      amount: {
        type: 'select',
        field: 'amount',
        options: ['0-1000', '1000-5000', '5000-10000', '10000+']
      },
      is_voided: { type: 'boolean', field: 'is_voided' },
      search: { type: 'text', fields: ['vendor_ref_name', 'doc_number'] }
    },
    statCards: [
      { label: 'Payments Today', calc: 'count', filter: { payment_date: 'today' } },
      { label: 'MTD Paid', calc: 'sum', field: 'total_amount', filter: { payment_date: 'this_month' } },
      { label: 'Total Payments', calc: 'count' },
      { label: 'Average Payment', calc: 'avg', field: 'total_amount' }
    ],
    columns: [
      { id: 'doc_number', label: 'Payment #', minWidth: 120 },
      { id: 'vendor_ref_name', label: 'Vendor', minWidth: 200 },
      { id: 'payment_date', label: 'Date', minWidth: 100 },
      { id: 'payment_type', label: 'Type', minWidth: 100 },
      { id: 'bank_account_ref_name', label: 'Account', minWidth: 150 },
      { id: 'total_amount', label: 'Amount', minWidth: 100 },
      { id: 'status', label: 'Status', align: 'center', minWidth: 100 }
    ],
    searchFields: ['vendor_ref_name', 'doc_number'],
    defaultSort: '-payment_date'
  },

  vendorcredit: {
    name: 'Vendor Credit',
    endpoint: '/vendorcredits',
    syncEndpoint: '/qb/vendorcredits/sync',
    statsEndpoint: '/vendorcredits/stats/',
    suggestionsEndpoint: '/vendorcredits/suggestions',
    displayField: 'vendor_ref_name',
    idField: 'id',
    detailDrawer: 'VendorCreditDetailDrawer',
    filters: {
      status: { type: 'select', options: ['open', 'applied', 'closed'] },
      vendor: { type: 'lookup', field: 'vendor_ref_id', dynamic: true },
      balance: { type: 'select', options: ['has_balance', 'fully_applied'] },
      age: { type: 'select', options: ['<30', '30-60', '60-90', '>90'] },
      search: { type: 'text', fields: ['vendor_ref_name', 'doc_number'] }
    },
    statCards: [
      { label: 'Open Credits', calc: 'count', filter: { status: 'open' } },
      { label: 'Total Available', calc: 'sum', field: 'balance' },
      { label: 'Expiring Soon', calc: 'count', filter: { is_expiring_soon: true } },
      { label: 'Unused >90 days', calc: 'count', filter: { age_days: { gt: 90 } } }
    ],
    columns: [
      { id: 'vendor_ref_name', label: 'Vendor', minWidth: 200 },
      { id: 'doc_number', label: 'Credit #', minWidth: 120 },
      { id: 'txn_date', label: 'Date', minWidth: 100 },
      { id: 'total_amount', label: 'Amount', minWidth: 100 },
      { id: 'balance', label: 'Balance', minWidth: 100 },
      { id: 'age_days', label: 'Age (days)', minWidth: 100 },
      { id: 'status', label: 'Status', align: 'center', minWidth: 100 }
    ],
    searchFields: ['vendor_ref_name', 'doc_number'],
    defaultSort: '-txn_date'
  },

  purchase: {
    name: 'Purchase',
    endpoint: '/expense/purchases',
    syncEndpoint: '/qb/purchases/sync',
    statsEndpoint: '/expense/purchases/stats/',
    suggestionsEndpoint: '/expense/purchases/suggestions/',
    displayField: 'entity_name',
    idField: 'id',
    detailDrawer: 'PurchaseDetailDrawer',
    filters: {
      search: { type: 'text', fields: ['doc_number', 'entity_name', 'memo'] },
      dateRange: { type: 'dateRange', field: 'purchase_date' },
      paymentType: { type: 'select', field: 'payment_type', options: ['Cash', 'Check', 'CreditCard'] },
      entity: { type: 'lookup', field: 'entity_ref_id' },
      amount: { type: 'range', field: 'amount', buckets: [1000, 5000, 10000] }
    },
    statCards: [
      { label: 'Total Purchases', calc: 'count' },
      { label: 'Total Amount', calc: 'sum', field: 'amount' },
      { label: 'Credit Card', calc: 'count', filter: { payment_type: 'CreditCard' } },
      { label: 'MTD Amount', calc: 'sum', field: 'amount', filter: { purchase_date: 'this_month' } }
    ],
    columns: [
      { id: 'entity_name', label: 'Vendor/Customer', minWidth: 200 },
      { id: 'purchase_date', label: 'Date', minWidth: 100 },
      { id: 'payment_type', label: 'Payment Type', minWidth: 120 },
      { id: 'amount', label: 'Amount', minWidth: 100 },
      { id: 'account_name', label: 'Account', minWidth: 150 }
    ],
    searchFields: ['doc_number', 'entity_name', 'memo'],
    defaultSort: '-purchase_date'
  },

  account: {
    name: 'Account',
    endpoint: '/account',
    syncEndpoint: '/qb/accounts/sync',
    statsEndpoint: '/account/stats/',
    suggestionsEndpoint: '/account/suggestions',
    displayField: 'fully_qualified_name',
    idField: 'id',
    detailDrawer: 'AccountDetailDrawer',
    filters: {
      type: {
        type: 'select',
        field: 'account_type',
        options: [
          'Bank',
          'Accounts Receivable',
          'Other Current Asset',
          'Fixed Asset',
          'Other Asset',
          'Accounts Payable',
          'Credit Card',
          'Other Current Liability',
          'Long Term Liability',
          'Equity',
          'Income',
          'Cost of Goods Sold',
          'Expense',
          'Other Income',
          'Other Expense'
        ]
      },
      subType: { type: 'select', field: 'account_sub_type', dynamic: true },
      status: { type: 'select', options: ['active', 'inactive'] },
      balance: { type: 'select', options: ['positive', 'negative', 'zero'] },
      classification: { type: 'select', options: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] },
      search: { type: 'text', fields: ['name', 'acct_num', 'fully_qualified_name'] }
    },
    statCards: [
      { label: 'Total Balance', calc: 'sum', field: 'current_balance' },
      { label: 'Total Assets', calc: 'sum', field: 'current_balance', filter: { classification: 'Asset' } },
      { label: 'Total Liabilities', calc: 'sum', field: 'current_balance', filter: { classification: 'Liability' } },
      { label: 'Total Accounts', calc: 'count' },
      { label: 'Active Accounts', calc: 'count', filter: { active: true } }
    ],
    columns: [
      { id: 'fully_qualified_name', label: 'Account Name', minWidth: 250 },
      { id: 'acct_num', label: 'Account #', minWidth: 100 },
      { id: 'account_type', label: 'Type', minWidth: 150 },
      { id: 'current_balance', label: 'Balance', minWidth: 120 },
      { id: 'status', label: 'Status', align: 'center', minWidth: 100 }
    ],
    searchFields: ['fully_qualified_name', 'name', 'acct_num'],
    defaultSort: 'fully_qualified_name'
  },

  item: {
    name: 'Item',
    endpoint: '/inventory',
    syncEndpoint: '/qb/items/sync',
    statsEndpoint: '/qb/items/stats/',
    displayField: 'name',
    idField: 'id',
    filters: {
      itemType: { type: 'select', field: 'item_type', options: ['Inventory', 'NonInventory', 'Service'] },
      category: { type: 'select', field: 'category', dynamic: true },
      active: { type: 'boolean', field: 'is_active' },
      lowStock: { type: 'boolean', field: 'low_stock' },
      search: { type: 'text', fields: ['name', 'sku', 'description'] }
    },
    statCards: [
      { label: 'Total Items', calc: 'count' },
      { label: 'Active Items', calc: 'count', filter: { is_active: true } },
      { label: 'Low Stock', calc: 'count', filter: { low_stock: true } },
      { label: 'Total Value', calc: 'sum', field: 'value_on_hand' }
    ],
    columns: [
      { id: 'name', label: 'Item Name', minWidth: 200 },
      { id: 'sku', label: 'SKU', minWidth: 120 },
      { id: 'category', label: 'Category', minWidth: 120 },
      { id: 'item_type', label: 'Type', minWidth: 100 },
      { id: 'quantity_on_hand', label: 'Quantity', align: 'center', minWidth: 80 },
      { id: 'unit_price', label: 'Unit Price', minWidth: 100 },
      { id: 'is_active', label: 'Active', align: 'center', minWidth: 80 },
      { id: 'sync_status', label: 'Sync Status', align: 'center', minWidth: 120 }
    ],
    searchFields: ['name', 'sku', 'description'],
    defaultSort: 'name',
    suggestionsEndpoint: '/qb/items/suggestions'
  }
} as const;
