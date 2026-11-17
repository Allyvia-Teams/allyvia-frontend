import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { AlertStrip } from 'ui-component/frame';

// project imports
import type { BankReport, BankTransaction } from 'api/banking';
import { bankMoney } from 'utils/bankMoney';
import { sourceChipLabel } from '../bankCategories';
import { tableDay, withRange, type Range } from './snapshotView';

// Session 10. What the bank feed adds to Finance for bank owners: the complete transaction list
// on /finance/cash (Part A, the deleted bank page's table) and the one feed strip on /finance and
// /finance/cash (Part B, the deleted bank page's alerts). Amounts are the bank's own strings,
// formatted only; nothing is added up here.

export const ALL_BANK_TITLE = 'All bank transactions';
export const ALL_BANK_CAPTION =
  'Money in, money out, transfers and pending. Change a category here if something landed in the wrong place.';
export const MISSING_SOMETHING = 'Missing something? See all bank transactions';

export interface BankTransactionRow {
  id: string;
  date: string;
  description: string;
  /** The bank's own category, lower case, under the description (as the old page showed it). */
  detail: string;
  account: string;
  amount: string;
  category: BankTransaction['category'];
  status: string;
  needsReview: boolean;
}

/** One row per bank movement, in the order the API returned them. */
export function bankTransactionRows(rows: BankTransaction[], range?: Range): BankTransactionRow[] {
  return rows.map((row) => ({
    id: row.id,
    date: tableDay(row.date, range),
    description: row.merchant || row.description,
    detail: (row.provider_category || '').replaceAll('_', ' ').toLowerCase(),
    account: [row.account_name, row.account_mask ? `••${row.account_mask}` : ''].filter(Boolean).join(' '),
    amount: bankMoney(row.amount, row.currency),
    category: row.category,
    status: sourceChipLabel(row.category_source, row.pending, row.category),
    needsReview: row.category === 'needs_review'
  }));
}

/** The Expenses page's one line for bank owners: the full list lives on Cash. */
export function allBankTransactionsLink(range: Range, locationId?: string | null) {
  return (
    <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
      <Link component={RouterLink} to={withRange('/finance/cash', range, locationId)} underline="hover">
        {MISSING_SOMETHING}
      </Link>
    </Box>
  );
}

// ------------------------------- Feed strip ------------------------------- //

export type FeedCondition = 'not_connected' | 'error' | 'stale' | 'importing';

export interface FeedAlert {
  condition: FeedCondition;
  title: string;
  body: string;
  action: { label: string; to: string } | null;
}

const MANAGE = { label: 'Manage bank', to: '/integrations/bank' };

/**
 * One strip, the most serious condition first: not connected, then an error (the connection
 * needs reconnecting), then stale, then history still importing. The words are the deleted bank
 * page's (not connected, importing, stale) and the integrations page's for an error
 * (`views/integrations/Bank.tsx`, read from `error_code`, as the integrations tile's
 * "needs attention" rule is). A healthy feed, or no report, says nothing.
 */
export function feedAlert(report: BankReport | null | undefined): FeedAlert | null {
  if (!report) return null;
  if (!report.connected)
    return { condition: 'not_connected', title: 'Connect a bank to automatically populate this page.', body: '', action: MANAGE };
  if (report.error_code)
    return {
      condition: 'error',
      title: 'The bank connection needs attention.',
      body: 'Reconnect to restore updates.',
      action: { label: 'Reconnect', to: '/integrations/bank' }
    };
  if (report.stale)
    return { condition: 'stale', title: 'Bank updates need attention.', body: 'These figures may be out of date.', action: MANAGE };
  if (!report.history_complete)
    return { condition: 'importing', title: 'Your bank history is still importing.', body: 'Totals may be incomplete.', action: null };
  return null;
}

/** The strip itself: the AlertStrip every Finance warning uses. */
export function FeedStrip({ alert }: { alert: FeedAlert }) {
  return <AlertStrip title={alert.title} body={alert.body || undefined} action={alert.action ?? undefined} />;
}
