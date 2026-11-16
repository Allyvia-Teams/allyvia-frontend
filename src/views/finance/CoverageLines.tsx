import { useState } from 'react';
import { Alert, Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import bankingApi, { type BankReport, type HistoryUpload } from 'api/banking';
import ConfirmActionDialog from 'ui-component/settings/team/ConfirmActionDialog';
import OlderHistoryDialog from './OlderHistoryDialog';
import { coverageLine, nudgeVisible, uploadLine, type Loaded } from './expenseTruth';

const dismissKey = (companyId: string) => `allyvia.expenseTruth.olderHistoryNudge.${companyId}`;

function readDismissed(companyId: string): boolean {
  try {
    return window.localStorage.getItem(dismissKey(companyId)) === '1';
  } catch {
    return false;
  }
}

function asLoaded<T>(query: { status: 'pending' | 'error' | 'success'; data?: T }): Loaded<T> {
  return query.status === 'success' ? { status: 'success', data: query.data as T } : { status: query.status };
}

/**
 * Expense truth X5, under "Money out by category": since when expenses are known,
 * the nudge to add older history while that is under a year, and the files
 * already added (each with Remove). Absent pieces simply do not render.
 */
export default function CoverageLines({
  report,
  today,
  companyId,
  isAdmin,
  stripe
}: {
  report: BankReport;
  today: string;
  companyId: string;
  isAdmin: boolean;
  stripe: boolean;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(() => readDismissed(companyId));
  const [adding, setAdding] = useState(false);
  const [toRemove, setToRemove] = useState<HistoryUpload | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const coverage = useQuery({
    queryKey: ['banking', 'coverage', companyId],
    queryFn: () => bankingApi.coverage(),
    enabled: !!companyId,
    retry: false
  });
  const uploads = useQuery({
    queryKey: ['banking', 'history', companyId],
    queryFn: () => bankingApi.historyUploads(),
    // X3's lane: Stripe feed, flag on, someone who may add. Otherwise it is absent.
    enabled: !!companyId && stripe && isAdmin,
    retry: false
  });

  const line = coverageLine({ coverage: asLoaded(coverage), report, today });
  const showNudge = nudgeVisible({ bankMode: true, stripe, canAdd: isAdmin, dismissed, coverage: coverage.data, today });
  const past = uploads.data ?? [];

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(dismissKey(companyId), '1');
    } catch {
      // Private window or blocked storage: the line stays hidden for this visit only.
    }
  };

  const remove = async () => {
    if (!toRemove) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      const { removed_rows: removed } = await bankingApi.historyRemove(toRemove.id);
      setNotice(`Removed ${removed.toLocaleString('en-US')} ${removed === 1 ? 'row' : 'rows'} from ${toRemove.filename}.`);
      setToRemove(null);
      await qc.invalidateQueries({ queryKey: ['banking'] });
    } catch {
      setRemoveError('Could not remove this file. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Stack spacing={1}>
      {line && (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {line.text}
          </Typography>
          {line.reconnect && (
            <Button size="small" onClick={() => navigate('/integrations/bank')}>
              Reconnect
            </Button>
          )}
        </Stack>
      )}
      {showNudge && (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            Add older bank history to see full seasons.
          </Typography>
          <Button size="small" onClick={() => setAdding(true)}>
            Add
          </Button>
          <IconButton size="small" aria-label="Dismiss" onClick={dismiss}>
            <IconX size={16} />
          </IconButton>
        </Stack>
      )}
      {past.length > 0 && (
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" sx={{ flex: 1 }}>
              Older history added
            </Typography>
            {!showNudge && (
              <Button size="small" onClick={() => setAdding(true)}>
                Add more
              </Button>
            )}
          </Stack>
          {past.map((u) => (
            <Stack key={u.id} direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {uploadLine(u)}
              </Typography>
              <Button size="small" color="inherit" onClick={() => setToRemove(u)}>
                Remove
              </Button>
            </Stack>
          ))}
        </Box>
      )}
      {uploads.isError && stripe && isAdmin && (
        <Typography variant="caption" color="text.secondary">
          Could not load the older history already added.
        </Typography>
      )}
      {notice && (
        <Alert severity="info" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {adding && <OlderHistoryDialog open onClose={() => setAdding(false)} accounts={report.accounts} />}
      <ConfirmActionDialog
        open={!!toRemove}
        title="Remove this file?"
        message={toRemove ? `The ${toRemove.filename} rows leave your expenses. Your bank's own rows stay.` : ''}
        confirmLabel="Remove"
        destructive
        working={removing}
        error={removeError}
        onClose={() => {
          setToRemove(null);
          setRemoveError(null);
        }}
        onConfirm={remove}
      />
    </Stack>
  );
}
