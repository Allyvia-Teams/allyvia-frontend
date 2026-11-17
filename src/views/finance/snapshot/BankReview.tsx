import { useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

// material-ui
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';

// project imports
import bankingApi, { type BankCategory } from 'api/banking';
import { reviewSnackbarText } from '../bankCategories';

// Bank owners recategorise a bank row from the Expenses table (moved from the old bank
// transactions panel, same behaviour): the PATCH, the "Saved. Applied to N other..." snackbar,
// Undo when the correction taught a merchant rule, and a refresh of every banking and finance
// query so the Categories summary, the chips' rows and the snapshot's figures all move.

export interface UndoTarget {
  merchantKey: string;
  rowId: string;
  previous: BankCategory;
}

/** Invalidate the banking and the finance queries (snapshot, expenses, profit, cash, sales). */
export async function refreshAfterReview(qc: Pick<QueryClient, 'invalidateQueries'>): Promise<void> {
  await qc.invalidateQueries({ queryKey: ['banking'] });
  await qc.invalidateQueries({ queryKey: ['finance'] });
}

export interface BankReview {
  savingId: string;
  error: string;
  change: (rowId: string, category: BankCategory, previous: BankCategory, merchant: string) => Promise<void>;
  snackbar: React.ReactNode;
}

export function useBankReview(): BankReview {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [snack, setSnack] = useState<{ text: string; undo: UndoTarget | null }>({ text: '', undo: null });

  const change = async (rowId: string, category: BankCategory, previous: BankCategory, merchant: string) => {
    setSavingId(rowId);
    setError('');
    try {
      const result = await bankingApi.review(rowId, category);
      setSnack({
        text: reviewSnackbarText(result.rule_created, result.rule_applied_count, merchant),
        // Only a rule is worth undoing; a lone correction is one select away.
        undo: result.rule_created ? { merchantKey: result.merchant_key, rowId, previous } : null
      });
      await refreshAfterReview(qc);
    } catch {
      setError('Could not save the category. Please retry.');
    } finally {
      setSavingId('');
    }
  };

  const undo = async (target: UndoTarget) => {
    setSnack({ text: '', undo: null });
    setSavingId(target.rowId);
    setError('');
    try {
      // The rule id is not in the review response, so find it by the key it was taught on.
      const rule = (await bankingApi.rules()).find((r) => r.merchant_key === target.merchantKey);
      if (rule) await bankingApi.deleteRule(rule.id);
      await bankingApi.review(target.rowId, target.previous);
      await refreshAfterReview(qc);
    } catch {
      setError('Could not undo that change. Please retry.');
    } finally {
      setSavingId('');
    }
  };

  const snackbar = (
    <Snackbar
      open={!!snack.text}
      autoHideDuration={snack.undo ? 10_000 : 4000}
      onClose={() => setSnack({ text: '', undo: null })}
      message={snack.text}
      action={
        snack.undo ? (
          <Button color="secondary" size="small" onClick={() => snack.undo && undo(snack.undo)}>
            Undo
          </Button>
        ) : null
      }
    />
  );

  return { savingId, error, change, snackbar };
}
