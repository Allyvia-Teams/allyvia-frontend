import { useEffect, useRef } from 'react';
import { Box, Typography, Alert, LinearProgress } from '@mui/material';
import { useDispatch, useSelector } from 'store';
import { fetchSquareImportStatus, fetchQBImportStatus } from 'store/slices/integrations';

export interface ImportJobProgressProps {
  source: 'square' | 'quickbooks';
  companyId: string;
  onComplete?: () => void;
}

export default function ImportJobProgress({ source, companyId, onComplete }: ImportJobProgressProps) {
  const dispatch = useDispatch();
  const { importJob } = useSelector((state) => (source === 'square' ? state.integrations.square : state.integrations.quickbooks));

  const prevStatusRef = useRef<string | null | undefined>(undefined);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!companyId) return;
    if (source === 'square') {
      dispatch(fetchSquareImportStatus(companyId));
    } else {
      dispatch(fetchQBImportStatus(companyId));
    }
  }, [dispatch, companyId, source]);

  useEffect(() => {
    const status = importJob?.status ?? null;
    if (status !== 'pending' && status !== 'running') return;

    const id = window.setInterval(() => {
      if (source === 'square') {
        dispatch(fetchSquareImportStatus(companyId));
      } else {
        dispatch(fetchQBImportStatus(companyId));
      }
    }, 3000);

    return () => window.clearInterval(id);
  }, [dispatch, companyId, source, importJob?.status]);

  useEffect(() => {
    const status = importJob?.status ?? null;
    const prev = prevStatusRef.current;
    if ((prev === 'pending' || prev === 'running') && status === 'completed') {
      onCompleteRef.current?.();
    }
    prevStatusRef.current = status;
  }, [importJob?.status]);

  if (!importJob || importJob.status === null) {
    return null;
  }

  const sourceLabel = source === 'square' ? 'Square' : 'QuickBooks';

  if (importJob.status === 'pending' || importJob.status === 'running') {
    const pct = Math.min(100, Math.max(0, importJob.pct_complete ?? 0));
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

  if (importJob.status === 'completed') {
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
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">{importJob.error_message || 'Import failed.'}</Alert>
      </Box>
    );
  }

  return null;
}
