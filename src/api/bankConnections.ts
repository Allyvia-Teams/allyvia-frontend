import axios from 'utils/axios';

/** Stripe Financial Connections (backend app `bank_connections`, flagged by BANK_CONNECTIONS_ENABLED). */

export type BankConnectionStatus = 'active' | 'inactive' | 'disconnected';

export interface BankConnection {
  id: number;
  institution_name: string;
  display_name: string;
  last4: string;
  category: string;
  subcategory: string;
  status: BankConnectionStatus;
  subscribed: boolean;
  balance_currency: string;
  /** Minor units (cents for USD). */
  balance_current: number | null;
  balance_available: number | null;
  balance_as_of: string | null;
  last_refreshed_at: string | null;
  created_at: string;
}

export interface BankTransaction {
  id: number;
  stripe_txn_id: string;
  /** Minor units, Stripe's sign: negative = money leaving the account. */
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'posted' | 'void';
  transacted_at: string;
  posted_at: string | null;
}

export interface MonthlyMoneyOut {
  /** YYYY-MM */
  month: string;
  currency: string;
  /** Positive minor units. */
  total: number;
}

export interface BankTransactionsPage {
  count: number;
  page: number;
  page_size: number;
  results: BankTransaction[];
  monthly_money_out: MonthlyMoneyOut[];
}

export interface TransactionsQuery {
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}

const bankConnectionsApi = {
  createSession: async (): Promise<string> => (await axios.post('/bank/connect-session/')).data.client_secret,
  list: async (): Promise<BankConnection[]> => (await axios.get('/bank/connections/')).data.results,
  link: async (sessionId: string): Promise<BankConnection[]> =>
    (await axios.post('/bank/connections/', { session_id: sessionId })).data.results,
  disconnect: async (id: number): Promise<BankConnection> => (await axios.delete(`/bank/connections/${id}/`)).data,
  transactions: async (id: number, query: TransactionsQuery = {}): Promise<BankTransactionsPage> =>
    (await axios.get(`/bank/connections/${id}/transactions/`, { params: query })).data
};

export default bankConnectionsApi;
