// /insights/history (S5): a minimal list of what was done on /insights during
// this visit, read from the visit record (visitRecord.ts) and resolved against
// the current payload. The outcome ledger replaces it.
//
// InsightsHistoryView is props-only so tests can render it statically.

import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import {
  Box,
  Breadcrumbs,
  Button,
  Link,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';

import { useSelector } from 'store';

import { getInsights } from './adapter';
import { formatVisitTime, HISTORY_NOTE, historyRows, type HistoryRow } from './history';
import { readVisitRecord, sessionStore } from './visitRecord';

export const INSIGHTS_ROUTE = '/insights';

export type HistoryLoad = { status: 'loading' } | { status: 'error' } | { status: 'ready'; storeName: string; rows: HistoryRow[] };

export interface InsightsHistoryViewProps {
  load: HistoryLoad;
  fallbackStoreName: string;
  onRetry: () => void;
  /** Formats a row's time; tests pass a fixed one so output does not depend on the time zone. */
  formatTime?: (at: number) => string;
}

const COLUMNS = ['Date', 'Category', 'Title', 'Impact', 'Outcome'] as const;

export function InsightsHistoryView({ load, fallbackStoreName, onRetry, formatTime = formatVisitTime }: InsightsHistoryViewProps) {
  const storeName = (load.status === 'ready' && load.storeName) || fallbackStoreName;

  return (
    <Box component="section" aria-labelledby="insights-history-title" sx={{ mb: 4 }} data-insights-history>
      <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 2, fontSize: '0.875rem' }}>
        {storeName && <Typography color="text.secondary">{storeName}</Typography>}
        <Link component={RouterLink} to={INSIGHTS_ROUTE} color="text.secondary" underline="hover">
          Insights
        </Link>
        <Typography color="text.primary" aria-current="page">
          History
        </Typography>
      </Breadcrumbs>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' }, mb: 3 }}
      >
        <Typography id="insights-history-title" variant="h1" sx={{ fontSize: '2rem', fontWeight: 700 }}>
          History
        </Typography>
        <Button variant="outlined" color="inherit" component={RouterLink} to={INSIGHTS_ROUTE} sx={{ alignSelf: { xs: 'flex-start' } }}>
          Back to Insights
        </Button>
      </Stack>

      <Typography color="text.secondary" sx={{ mb: 2 }} data-history-note>
        {HISTORY_NOTE}
      </Typography>

      {load.status === 'loading' && (
        <Stack spacing={1} aria-busy="true" aria-label="Loading history" data-history-loading>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={40} />
          ))}
        </Stack>
      )}

      {load.status === 'error' && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }} role="alert" data-history-error>
          <Typography color="error">Could not load recommendations.</Typography>
          <Button size="small" variant="outlined" onClick={onRetry}>
            Retry
          </Button>
        </Stack>
      )}

      {load.status === 'ready' &&
        (load.rows.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4 }} data-history-empty>
            Nothing acted on or dismissed yet this visit.
          </Typography>
        ) : (
          // The table scrolls sideways inside its own box on narrow screens; the page does not.
          <TableContainer
            sx={{ border: 1, borderColor: 'divider', borderRadius: '12px', overflowX: 'auto', bgcolor: 'background.paper' }}
            data-history-table
          >
            <Table size="small" aria-labelledby="insights-history-title" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  {COLUMNS.map((column) => (
                    <TableCell key={column} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {column}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {load.rows.map((row) => (
                  <TableRow key={row.id} data-history-row={row.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatTime(row.at)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.category}</TableCell>
                    <TableCell sx={{ minWidth: 240 }}>{row.title}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.impact}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.outcome}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ))}
    </Box>
  );
}

export default function InsightsHistoryPage() {
  const companyName = useSelector((state) => state.auth?.currentRole?.company_name) ?? '';
  const [load, setLoad] = useState<HistoryLoad>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoad({ status: 'loading' });
    getInsights()
      .then((payload) => {
        if (cancelled) return;
        const record = readVisitRecord(sessionStore(), payload.refreshedAt);
        setLoad({ status: 'ready', storeName: payload.storeName, rows: historyRows(record, payload.recommendations) });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn('[insights-redesign] getInsights failed', error);
        setLoad({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return <InsightsHistoryView load={load} fallbackStoreName={companyName} onRetry={() => setAttempt((n) => n + 1)} />;
}
