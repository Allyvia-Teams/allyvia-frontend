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
  options?: string[];
  fields?: string[];
  buckets?: number[];
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
  statCards: StatCard[];
  columns: ColumnConfig[];
  searchFields?: string[];
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
      { id: 'amount', label: 'Amount', align: 'right', minWidth: 100 },
      { id: 'balance', label: 'Balance', align: 'right', minWidth: 100 },
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
      state: { type: 'select', field: 'billing_address_state', dynamic: true },
      search: { type: 'text', fields: ['display_name', 'primary_email', 'primary_phone'] }
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
      { id: 'balance', label: 'Balance', align: 'right', minWidth: 100 },
      { id: 'billing_address_state', label: 'State', minWidth: 80 },
      { id: 'status', label: 'Status', align: 'center', minWidth: 100 }
    ],
    searchFields: ['display_name', 'primary_email', 'primary_phone'],
    defaultSort: 'display_name'
  },

  vendor: {
    name: 'Vendor',
    endpoint: '/vendors',
    syncEndpoint: '/qb/vendors/sync',
    displayField: 'display_name',
    idField: 'id',
    filters: {
      status: { type: 'select', options: ['active', 'inactive'] },
      balance: { type: 'select', options: ['owes_us', 'we_owe', 'zero'] },
      is1099: { type: 'boolean', field: 'vendor_1099' },
      state: { type: 'select', field: 'billing_address_state', dynamic: true },
      search: { type: 'text', fields: ['display_name', 'primary_email'] }
    },
    statCards: [
      { label: 'Active Vendors', calc: 'count', filter: { active: true } },
      { label: 'Total Payable', calc: 'sum', field: 'balance' },
      { label: 'Vendors to Pay', calc: 'count', filter: { balance: { gt: 0 } } },
      { label: 'Top Vendor', calc: 'max', field: 'balance', display: 'display_name' }
    ],
    columns: [
      { id: 'display_name', label: 'Vendor Name', minWidth: 200 },
      { id: 'primary_email', label: 'Email', minWidth: 180 },
      { id: 'balance', label: 'Balance', align: 'right', minWidth: 100 },
      { id: 'vendor_1099', label: '1099', align: 'center', minWidth: 60 },
      { id: 'billing_address_state', label: 'State', minWidth: 80 },
      { id: 'status', label: 'Status', align: 'center', minWidth: 100 },
      { id: 'sync_status', label: 'Sync Status', align: 'center', minWidth: 120 }
    ],
    searchFields: ['display_name', 'primary_email'],
    defaultSort: 'display_name'
  },

  invoice: {
    name: 'Invoice',
    endpoint: '/invoices',
    syncEndpoint: '/qb/invoices/sync',
    displayField: 'doc_number',
    idField: 'id',
    filters: {
      status: { type: 'select', options: ['paid', 'unpaid', 'overdue'] },
      dateRange: { type: 'dateRange', field: 'date' },
      customer: { type: 'lookup', field: 'customer_ref_id' },
      amount: { type: 'range', field: 'total_amount', buckets: [1000, 5000] },
      emailed: { type: 'boolean', field: 'emailed_at' }
    },
    statCards: [
      { label: 'Open Invoices', calc: 'count', filter: { status: 'unpaid' } },
      { label: 'Outstanding', calc: 'sum', field: 'balance' },
      { label: 'Overdue', calc: 'sum', field: 'balance', filter: { status: 'overdue' } },
      { label: 'MTD Revenue', calc: 'sum', field: 'total_amount', filter: { date: 'this_month', status: 'paid' } }
    ],
    columns: [
      { id: 'doc_number', label: 'Invoice #', minWidth: 120 },
      { id: 'customer_name', label: 'Customer', minWidth: 200 },
      { id: 'date', label: 'Date', minWidth: 100 },
      { id: 'due_date', label: 'Due Date', minWidth: 100 },
      { id: 'total_amount', label: 'Amount', align: 'right', minWidth: 100 },
      { id: 'balance', label: 'Balance', align: 'right', minWidth: 100 },
      { id: 'status', label: 'Status', align: 'center', minWidth: 100 },
      { id: 'sync_status', label: 'Sync Status', align: 'center', minWidth: 120 }
    ],
    searchFields: ['doc_number', 'customer_name'],
    defaultSort: '-date'
  },

  payment: {
    name: 'Payment',
    endpoint: '/payments',
    syncEndpoint: '/qb/payments/sync',
    displayField: 'payment_ref_num',
    idField: 'id',
    filters: {
      dateRange: { type: 'dateRange', field: 'transaction_date' },
      customer: { type: 'lookup', field: 'customer_ref_id' },
      paymentMethod: { type: 'select', field: 'payment_method', dynamic: true },
      amount: { type: 'range', field: 'total_amount' }
    },
    statCards: [
      { label: 'Total Payments', calc: 'count' },
      { label: 'Total Received', calc: 'sum', field: 'total_amount' },
      { label: "Today's Payments", calc: 'sum', field: 'total_amount', filter: { transaction_date: 'today' } },
      { label: 'Average Payment', calc: 'avg', field: 'total_amount' }
    ],
    columns: [
      { id: 'payment_ref_num', label: 'Payment #', minWidth: 120 },
      { id: 'customer_name', label: 'Customer', minWidth: 200 },
      { id: 'transaction_date', label: 'Date', minWidth: 100 },
      { id: 'payment_method', label: 'Method', minWidth: 120 },
      { id: 'total_amount', label: 'Amount', align: 'right', minWidth: 100 },
      { id: 'unapplied_amount', label: 'Unapplied', align: 'right', minWidth: 100 },
      { id: 'sync_status', label: 'Sync Status', align: 'center', minWidth: 120 }
    ],
    searchFields: ['payment_ref_num', 'customer_name'],
    defaultSort: '-transaction_date'
  },

  billpayment: {
    name: 'Bill Payment',
    endpoint: '/billpayments',
    syncEndpoint: '/qb/billpayments/sync',
    displayField: 'doc_number',
    idField: 'id',
    filters: {
      dateRange: { type: 'dateRange', field: 'payment_date' },
      vendor: { type: 'lookup', field: 'vendor_ref_id' },
      paymentType: { type: 'select', field: 'payment_type', options: ['Check', 'CreditCard', 'Cash', 'ACHTransfer'] },
      amount: { type: 'range', field: 'total_amount' }
    },
    statCards: [
      { label: 'Total Payments', calc: 'count' },
      { label: 'Total Paid', calc: 'sum', field: 'total_amount' },
      { label: 'This Month', calc: 'sum', field: 'total_amount', filter: { payment_date: 'this_month' } },
      { label: 'By Check', calc: 'count', filter: { payment_type: 'Check' } }
    ],
    columns: [
      { id: 'doc_number', label: 'Payment #', minWidth: 120 },
      { id: 'vendor_ref_name', label: 'Vendor', minWidth: 200 },
      { id: 'payment_date', label: 'Date', minWidth: 100 },
      { id: 'payment_type', label: 'Type', minWidth: 100 },
      { id: 'total_amount', label: 'Amount', align: 'right', minWidth: 100 },
      { id: 'is_voided', label: 'Voided', align: 'center', minWidth: 80 },
      { id: 'sync_status', label: 'Sync Status', align: 'center', minWidth: 120 }
    ],
    searchFields: ['doc_number', 'vendor_ref_name'],
    defaultSort: '-payment_date'
  },

  account: {
    name: 'Account',
    endpoint: '/accounts',
    syncEndpoint: '/qb/accounts/sync',
    displayField: 'name',
    idField: 'id',
    filters: {
      accountType: { type: 'select', field: 'account_type', dynamic: true },
      subType: { type: 'select', field: 'account_sub_type', dynamic: true },
      active: { type: 'boolean', field: 'is_active' },
      search: { type: 'text', fields: ['name', 'account_number'] }
    },
    statCards: [
      { label: 'Total Accounts', calc: 'count' },
      { label: 'Active Accounts', calc: 'count', filter: { is_active: true } },
      { label: 'Total Assets', calc: 'sum', field: 'current_balance', filter: { account_type: 'Asset' } },
      { label: 'Total Liabilities', calc: 'sum', field: 'current_balance', filter: { account_type: 'Liability' } }
    ],
    columns: [
      { id: 'account_number', label: 'Account #', minWidth: 100 },
      { id: 'name', label: 'Account Name', minWidth: 200 },
      { id: 'account_type', label: 'Type', minWidth: 120 },
      { id: 'account_sub_type', label: 'Sub Type', minWidth: 150 },
      { id: 'current_balance', label: 'Balance', align: 'right', minWidth: 120 },
      { id: 'is_active', label: 'Active', align: 'center', minWidth: 80 },
      { id: 'sync_status', label: 'Sync Status', align: 'center', minWidth: 120 }
    ],
    searchFields: ['name', 'account_number'],
    defaultSort: 'name'
  },

  purchase: {
    name: 'Purchase',
    endpoint: '/purchases',
    syncEndpoint: '/qb/purchases/sync',
    displayField: 'doc_number',
    idField: 'id',
    filters: {
      dateRange: { type: 'dateRange', field: 'purchase_date' },
      paymentType: { type: 'select', field: 'payment_type', options: ['Cash', 'Check', 'CreditCard'] },
      entity: { type: 'lookup', field: 'entity_ref_id' },
      amount: { type: 'range', field: 'amount' }
    },
    statCards: [
      { label: 'Total Purchases', calc: 'count' },
      { label: 'Total Amount', calc: 'sum', field: 'amount' },
      { label: 'Cash Purchases', calc: 'count', filter: { payment_type: 'Cash' } },
      { label: 'MTD Purchases', calc: 'sum', field: 'amount', filter: { purchase_date: 'this_month' } }
    ],
    columns: [
      { id: 'doc_number', label: 'Purchase #', minWidth: 120 },
      { id: 'entity_name', label: 'Vendor/Customer', minWidth: 200 },
      { id: 'purchase_date', label: 'Date', minWidth: 100 },
      { id: 'payment_type', label: 'Payment Type', minWidth: 120 },
      { id: 'amount', label: 'Amount', align: 'right', minWidth: 100 },
      { id: 'account_name', label: 'Account', minWidth: 150 },
      { id: 'sync_status', label: 'Sync Status', align: 'center', minWidth: 120 }
    ],
    searchFields: ['doc_number', 'entity_name', 'memo'],
    defaultSort: '-purchase_date'
  },

  vendorcredit: {
    name: 'Vendor Credit',
    endpoint: '/vendorcredits',
    syncEndpoint: '/qb/vendorcredits/sync',
    displayField: 'doc_number',
    idField: 'id',
    filters: {
      dateRange: { type: 'dateRange', field: 'txn_date' },
      vendor: { type: 'lookup', field: 'vendor_ref_id' },
      amount: { type: 'range', field: 'total_amount' },
      hasBalance: { type: 'boolean', field: 'balance' }
    },
    statCards: [
      { label: 'Total Credits', calc: 'count' },
      { label: 'Total Amount', calc: 'sum', field: 'total_amount' },
      { label: 'Available Credit', calc: 'sum', field: 'balance' },
      { label: 'Unused Credits', calc: 'count', filter: { balance: { gt: 0 } } }
    ],
    columns: [
      { id: 'doc_number', label: 'Credit #', minWidth: 120 },
      { id: 'vendor_ref_name', label: 'Vendor', minWidth: 200 },
      { id: 'txn_date', label: 'Date', minWidth: 100 },
      { id: 'total_amount', label: 'Amount', align: 'right', minWidth: 100 },
      { id: 'balance', label: 'Balance', align: 'right', minWidth: 100 },
      { id: 'ap_account_ref_name', label: 'AP Account', minWidth: 150 },
      { id: 'sync_status', label: 'Sync Status', align: 'center', minWidth: 120 }
    ],
    searchFields: ['doc_number', 'vendor_ref_name', 'private_note'],
    defaultSort: '-txn_date'
  },

  item: {
    name: 'Item',
    endpoint: '/inventory',
    syncEndpoint: '/qb/items/sync',
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
      { id: 'unit_price', label: 'Unit Price', align: 'right', minWidth: 100 },
      { id: 'is_active', label: 'Active', align: 'center', minWidth: 80 },
      { id: 'sync_status', label: 'Sync Status', align: 'center', minWidth: 120 }
    ],
    searchFields: ['name', 'sku', 'description'],
    defaultSort: 'name',
    suggestionsEndpoint: '/qb/items/suggestions'
  }
} as const;
