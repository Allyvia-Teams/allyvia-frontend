import axios from 'utils/axios';

export type FinancialSource = 'quickbooks' | 'bank';
export type BankCategory =
  | 'inventory'
  | 'labour'
  | 'opex'
  | 'capex'
  | 'technology'
  | 'marketing'
  | 'income'
  | 'transfer'
  | 'financing'
  | 'tax'
  | 'personal'
  | 'needs_review';
/** The six buckets that count as an expense, in the order the Finance card lists them. */
export const EXPENSE_BUCKETS = ['inventory', 'labour', 'opex', 'capex', 'technology', 'marketing'] as const;
export type ExpenseBucket = (typeof EXPENSE_BUCKETS)[number];
export const BANK_CATEGORIES: Record<BankCategory, string> = {
  inventory: 'Inventory purchase',
  labour: 'Labour / payroll',
  opex: 'Operating expense',
  capex: 'Capital expense',
  technology: 'Technology / software',
  marketing: 'Marketing / advertising',
  income: 'Business income',
  transfer: 'Transfer / card repayment',
  financing: 'Loan / owner funding',
  tax: 'Tax payment',
  personal: 'Personal / excluded',
  needs_review: 'Needs review'
};
export const CATEGORY_GROUPS: { label: string; categories: BankCategory[] }[] = [
  { label: 'Expenses', categories: [...EXPENSE_BUCKETS] },
  { label: 'Money movement', categories: ['transfer', 'financing'] },
  { label: 'Other', categories: ['income', 'tax', 'personal', 'needs_review'] }
];
/** Which resolver layer decided a row; 'owner' is reported when the owner overrode it. */
export type CategorySource = 'rule' | 'dictionary' | 'provider' | 'none' | 'owner';

export interface FinancialSourceStatus {
  source: FinancialSource;
  choice_saved: boolean;
  bank_available: boolean;
  quickbooks_connected: boolean;
  connection: {
    id: string;
    last_synced_at: string | null;
    institution_updated_at: string | null;
    history_complete: boolean;
    error_code: string;
  } | null;
}

export interface BankCurrency {
  currency: string;
  cash_in: string;
  cash_out: string;
  net_cash_movement: string;
  // Sent only once the backend sorts bank transactions into categories; today's
  // /banking/report/ has none of these. The Finance card reads them via expenseCardView.
  expenses_by_bucket?: Record<ExpenseBucket, string>;
  expenses_total?: string;
  unclassified_outflow?: string;
  /** Share of classifiable outflow that was sorted, 4dp; null when there was no outflow. */
  coverage?: string | null;
  /** Posted rows in this currency — the top-level count also includes pending ones. */
  transaction_count?: number;
  classified_income: string;
  pending_outflows: string;
  pending_inflows: string;
  card_spending: string;
  cash_balance: string | null;
  card_balance: string | null;
}

export interface BankReport {
  source: 'bank';
  connected: boolean;
  history_complete: boolean;
  last_synced_at: string | null;
  institution_updated_at: string | null;
  stale: boolean;
  error_code: string;
  transaction_count: number;
  needs_review_count: number;
  /** Arrives with bank categorization, like the currency fields above. */
  rules_count?: number;
  currencies: BankCurrency[];
  accounts: {
    id: string;
    name: string;
    mask: string;
    type: string;
    currency: string;
    current_balance: string | null;
    available_balance: string | null;
  }[];
  categories: { currency: string; category: BankCategory; amount: string }[];
}

export interface BankTransaction {
  id: string;
  date: string;
  amount: string;
  currency: string;
  merchant: string;
  description: string;
  pending: boolean;
  account_name: string;
  account_mask: string;
  account_type: string;
  category: BankCategory;
  merchant_key: string;
  category_source: CategorySource;
  reviewed: boolean;
  provider_category: string;
  provider_confidence: string;
}

export interface ReviewResult extends BankTransaction {
  rule_created: boolean;
  rule_applied_count: number;
  /** Only sent when the descriptor had no usable merchant name; absent otherwise. */
  rule_reason?: 'no_merchant_name';
}

export interface MerchantRule {
  id: string;
  merchant_key: string;
  category: BankCategory;
  created_at: string;
  transaction_count: number;
}

export interface BankRange {
  start_date: string;
  end_date: string;
}

const bankingApi = {
  source: async (): Promise<FinancialSourceStatus> => (await axios.get('/banking/source/')).data,
  selectSource: async (source: FinancialSource): Promise<FinancialSourceStatus> => (await axios.post('/banking/source/', { source })).data,
  linkToken: async (connectionId?: string): Promise<{ link_token: string; session_id: string }> =>
    (await axios.post('/banking/link-token/', connectionId ? { connection_id: connectionId } : {})).data,
  exchange: async (sessionId: string, publicToken: string): Promise<{ connected: boolean; sync_queued: boolean }> =>
    (await axios.post('/banking/exchange/', { session_id: sessionId, public_token: publicToken })).data,
  sync: async () => (await axios.post('/banking/sync/')).data,
  disconnect: async () => (await axios.post('/banking/disconnect/')).data,
  report: async (range: BankRange): Promise<BankReport> => (await axios.get('/banking/report/', { params: range })).data,
  transactions: async (range: BankRange, page: number, needsReview: boolean): Promise<{ count: number; results: BankTransaction[] }> =>
    (await axios.get('/banking/transactions/', { params: { ...range, page, needs_review: needsReview } })).data,
  review: async (id: string, category: BankCategory): Promise<ReviewResult> =>
    (await axios.patch(`/banking/transactions/${id}/`, { category })).data,
  rules: async (): Promise<MerchantRule[]> => (await axios.get('/banking/rules/')).data,
  deleteRule: async (id: string): Promise<{ reapplied_count: number }> => (await axios.delete(`/banking/rules/${id}/`)).data
};
export default bankingApi;
