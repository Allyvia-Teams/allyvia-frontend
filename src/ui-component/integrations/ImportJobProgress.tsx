import { useEffect, useRef } from 'react';
import { Box, Typography, Alert, LinearProgress } from '@mui/material';
import { useSelector } from 'store';
import { importJobError } from 'views/pos-integrations/globalSync';

export interface ImportJobProgressProps {
  source: 'square' | 'quickbooks';
  /** Unused since the header's sync indicator took over polling; kept so callers need no change. */
  companyId: string;
  onComplete?: () => void;
}

export default function ImportJobProgress({ source, onComplete }: ImportJobProgressProps) {
  const { importJob } = useSelector((state) => (source === 'square' ? state.integrations.square : state.integrations.quickbooks));

  const prevStatusRef = useRef<string | null | undefined>(undefined);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // No fetching here. The page loads the job on mount, and the header's sync
  // indicator (useGlobalSync) rereads it every few seconds while it runs, so a
  // second poll from this card would only double the requests.

  useEffect(() => {
    const status = importJob?.status ?? null;
    const prev = prevStatusRef.current;
    if ((prev === 'pending' || prev === 'running') && (status === 'complete' || status === 'completed')) {
      onCompleteRef.current?.();
    }
    prevStatusRef.current = status;
  }, [importJob?.status]);

  if (!importJob || importJob.status === null) {
    return null;
  }

  const sourceLabel = source === 'square' ? 'Square' : 'QuickBooks';
  const isComplete = importJob.status === 'complete' || importJob.status === 'completed';

  if (importJob.status === 'pending' || importJob.status === 'running') {
    const derivedPct = importJob.total_entities > 0 ? (importJob.completed_entities / importJob.total_entities) * 100 : 0;
    const pctSource = importJob.pct_complete > 0 ? importJob.pct_complete : derivedPct;
    const pct = Math.min(100, Math.max(0, pctSource));
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          Import progress
        </Typography>
        <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 1 }} />
        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
          {pct}% complete
          {importJob.total_entities > 0 ? ` · ${importJob.completed_entities} / ${importJob.total_entities} records` : null}
        </Typography>
      </Box>
    );
  }

  if (isComplete) {
    const completedAt =
      importJob.completed_at != null
        ? new Date(importJob.completed_at).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
          })
        : null;

    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="success">
          Your {sourceLabel} data has been imported into Allyvia.
          {completedAt ? (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Completed {completedAt}
            </Typography>
          ) : null}
        </Alert>
      </Box>
    );
  }

  if (importJob.status === 'failed') {
    const displayError = importJobError(importJob.error_message);

    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">{displayError}</Alert>
      </Box>
    );
  }

  return null;
}
