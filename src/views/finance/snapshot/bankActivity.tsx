import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

// project imports
import type { BankTransaction } from 'api/banking';
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
