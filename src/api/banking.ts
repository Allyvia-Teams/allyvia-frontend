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
export type CategorySource = 'rule' | 'dictionary' | 'provider' | 'description' | 'none' | 'owner';

/** Which bank provider feeds Finance: Stripe whenever BANK_CONNECTIONS_ENABLED is on. */
export type BankProvider = 'plaid' | 'stripe';

export interface FinancialSourceStatus {
  source: FinancialSource;
  choice_saved: boolean;
  bank_available: boolean;
  /** Absent from older servers, which only know Plaid. */
  provider?: BankProvider;
  quickbooks_connected: boolean;
  connection: {
    id: string;
    last_synced_at: string | null;
    institution_updated_at: string | null;
    /** Whether the bank's history has finished importing (Finance's "still importing" alert). Read as absent if a server omits it. */
    history_complete?: boolean;
    error_code: string;
    /** Stripe only: the newest transaction date, so Finance opens on real activity. */
    latest_activity_date?: string | null;
    /** When the bank was connected, for either provider. Absent from older servers. */
    created_at?: string | null;
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

/** One merchant's unsorted money out (GET /banking/unsorted/, expense truth X5). */
export interface UnsortedMerchant {
  /** Blank when the bank gave no usable merchant name: such rows cannot become a rule. */
  merchant_key: string;
  name: string;
  currency: string;
  total: string;
  count: number;
  /** The merchant's newest unsorted row; sorting it teaches the merchant rule. */
  transaction_id: string;
}

export interface UnsortedMoneyOut {
  merchants: UnsortedMerchant[];
  totals: { currency: string; total: string; count: number; merchants: number }[];
}

/** Which days the expense source covers (GET /banking/coverage/, the stored precedents.ExpenseCoverage). */
export interface ExpenseCoverageWindow {
  currency: string;
  source: 'bank' | 'csv' | 'accounting';
  covered_from: string;
  covered_to: string;
  feed_from: string | null;
  history_from: string | null;
}

export type SignReading = 'negative_is_out' | 'positive_is_out' | 'debit_credit';
export type DateOrder = 'dmy' | 'mdy';

/** POST /banking/history/preview/ (expense truth X3). Saves nothing. */
export interface HistoryPreview {
  account: string;
  filename: string;
  sha256: string;
  columns: string[];
  problems: string[];
  can_commit: boolean;
  needs_date_order: boolean;
  sign_reading: SignReading | null;
  sign_readings: SignReading[];
  date_range: [string, string] | null;
  rows_total: number;
  rows_kept: number;
  rows_already_covered: number;
  rows_duplicate: number;
  kept_range: [string, string] | null;
  samples: { date: string; description: string; amount: string; direction: 'money_out' | 'money_in' }[];
}

export interface HistoryUpload {
  id: string;
  account_id: string;
  filename: string;
  sha256: string;
  sign_reading: SignReading;
  rows_kept: number;
  rows_now: number;
  rows_skipped_covered: number;
  rows_skipped_duplicate: number;
  first_date: string | null;
  last_date: string | null;
  uploaded_by: string | null;
  created_at: string;
}

const historyForm = (accountId: string, file: File, extra: Record<string, string> = {}) => {
  const form = new FormData();
  form.append('account_id', accountId);
  form.append('file', file);
  Object.entries(extra).forEach(([key, value]) => form.append(key, value));
  return form;
};

/** A statement can be large; the shared client's 20 s timeout is too short for it. */
const UPLOAD = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 };

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
  deleteRule: async (id: string): Promise<{ reapplied_count: number }> => (await axios.delete(`/banking/rules/${id}/`)).data,
  unsorted: async (range: BankRange): Promise<UnsortedMoneyOut> => (await axios.get('/banking/unsorted/', { params: range })).data,
  coverage: async (): Promise<ExpenseCoverageWindow[]> => (await axios.get('/banking/coverage/')).data.coverage,
  historyPreview: async (accountId: string, file: File, dateOrder?: DateOrder): Promise<HistoryPreview> =>
    (await axios.post('/banking/history/preview/', historyForm(accountId, file, dateOrder ? { date_order: dateOrder } : {}), UPLOAD)).data,
  historyCommit: async (
    accountId: string,
    file: File,
    sha256: string,
    signReading: SignReading,
    dateOrder?: DateOrder
  ): Promise<HistoryUpload> =>
    (
      await axios.post(
        '/banking/history/',
        historyForm(accountId, file, { sha256, sign_reading: signReading, ...(dateOrder ? { date_order: dateOrder } : {}) }),
        UPLOAD
      )
    ).data.upload,
  historyUploads: async (): Promise<HistoryUpload[]> => (await axios.get('/banking/history/')).data.uploads,
  historyRemove: async (id: string): Promise<{ removed_rows: number }> => (await axios.delete(`/banking/history/${id}/`)).data
};
export default bankingApi;
