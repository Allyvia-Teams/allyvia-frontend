import axios from 'utils/axios';

export type FinancialSource = 'quickbooks' | 'bank';
export type BankCategory = 'needs_review' | 'expense' | 'income' | 'transfer' | 'financing' | 'inventory' | 'tax' | 'personal';
export const BANK_CATEGORIES: Record<BankCategory, string> = {
  needs_review: 'Needs review',
  expense: 'Operating expense',
  income: 'Business income',
  transfer: 'Transfer / card repayment',
  financing: 'Loan / owner funding',
  inventory: 'Inventory purchase',
  tax: 'Tax payment',
  personal: 'Personal / excluded'
};

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
  operating_expenses: string;
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
  reviewed: boolean;
  provider_category: string;
  provider_confidence: string;
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
  review: async (id: string, category: BankCategory): Promise<BankTransaction> =>
    (await axios.patch(`/banking/transactions/${id}/`, { category })).data
};
export default bankingApi;
