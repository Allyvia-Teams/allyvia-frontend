import { useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { IconCircleCheck, IconDownload } from '@tabler/icons-react';

import type { IngestionJob, OnboardingState, RejectedRowsResponse, StagedTableSummary } from 'api/onboarding.api';
import { sourceFilename, tableDisplayName, type WizardStep } from '../wizardState';
import { useJobDetail, useRejectedRows } from '../hooks/useOnboardingQueries';
import { rejectedCsvFilename, rejectedRowsCsv } from '../csv';
import JobErrorAlert from './JobErrorAlert';

const REJECTED_PREVIEW_ROWS = 10;

// Client-side CSV download of the ≤100-row rejected sample.
const downloadRejectedCsv = (payload: RejectedRowsResponse) => {
  const csv = rejectedRowsCsv(payload);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = rejectedCsvFilename(payload.bq_table_id);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

interface TableHealthSectionProps {
  table: StagedTableSummary;
  displayName: string;
  onRejectedTotal: (tableId: string, total: number) => void;
}

function TableHealthSection({ table, displayName, onRejectedTotal }: TableHealthSectionProps) {
  const rejected = useRejectedRows(table.id);
  const [previewOpen, setPreviewOpen] = useState(false);

  const total = rejected.data?.total;
  useEffect(() => {
    if (total !== undefined) onRejectedTotal(table.id, total);
  }, [total, table.id, onRejectedTotal]);

  const previewColumns = (() => {
    if (!rejected.data || rejected.data.rows.length === 0) return [];
    const columns = ['reject_reasons'];
    const seen = new Set(columns);
    for (const row of rejected.data.rows) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) {
          seen.add(key);
          columns.push(key);
        }
      }
    }
    return columns;
  })();

  return (
    <Box sx={{ py: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          {displayName}
        </Typography>
        <Chip size="small" variant="outlined" label={table.inferred_entity || 'unknown entity'} />
        {table.proposal_status && <Chip size="small" variant="outlined" label={table.proposal_status} />}
        <Typography variant="caption" color="text.secondary">
          {table.row_count.toLocaleString()} rows
        </Typography>
      </Stack>

      {rejected.isLoading && <Skeleton variant="rounded" height={24} sx={{ mt: 1 }} />}

      {rejected.isError && (
        <Alert
          severity="error"
          sx={{ mt: 1 }}
          action={
            <Button color="inherit" size="small" onClick={() => rejected.refetch()}>
              Retry
            </Button>
          }
        >
          Couldn&apos;t read rejected rows from BigQuery.
        </Alert>
      )}

      {rejected.data && rejected.data.total === 0 && (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1, color: 'success.main' }}>
          <IconCircleCheck size={16} />
          <Typography variant="caption">All rows passed validation</Typography>
        </Stack>
      )}

      {rejected.data && rejected.data.total > 0 && (
        <Box sx={{ mt: 1 }}>
          <Alert severity="warning" sx={{ mb: 1 }}>
            {rejected.data.total.toLocaleString()} row{rejected.data.total === 1 ? '' : 's'} rejected
          </Alert>
          <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }}>
            {Object.entries(rejected.data.reasons_summary).map(([reason, count]) => (
              <Chip key={reason} size="small" variant="outlined" color="warning" label={`${reason} × ${count}`} />
            ))}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => setPreviewOpen((open) => !open)}>
              {previewOpen ? 'Hide sample' : 'Show sample'}
            </Button>
            <Button size="small" startIcon={<IconDownload size={16} />} onClick={() => downloadRejectedCsv(rejected.data)}>
              Download sample (CSV)
            </Button>
            {rejected.data.total > rejected.data.rows.length && (
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                Sample of {rejected.data.total.toLocaleString()} total rows
              </Typography>
            )}
          </Stack>
          <Collapse in={previewOpen}>
            <TableContainer sx={{ mt: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 320 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {previewColumns.map((column) => (
                      <TableCell key={column}>{column}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rejected.data.rows.slice(0, REJECTED_PREVIEW_ROWS).map((row, index) => (
                    <TableRow key={index}>
                      {previewColumns.map((column) => {
                        const value = row[column];
                        const text = Array.isArray(value) ? value.join('; ') : value === null || value === undefined ? '' : String(value);
                        return (
                          <TableCell
                            key={column}
                            sx={{ whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {text}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}

interface JobHealthCardProps {
  job: IngestionJob;
  state: OnboardingState;
  goToStep: (step: WizardStep) => void;
  onRejectedTotal: (tableId: string, total: number) => void;
}

export default function JobHealthCard({ job, state, goToStep, onRejectedTotal }: JobHealthCardProps) {
  const detail = useJobDetail(job.id, false);
  const filename = sourceFilename(state, job.source);
  const stats = job.stats ?? {};
  const normalizeActions = stats.normalize?.actions;

  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          {filename}
        </Typography>
        <Chip
          size="small"
          variant="outlined"
          color={job.phase === 'done' ? 'success' : 'error'}
          label={job.phase === 'done' ? 'Imported' : 'Failed'}
        />
        {normalizeActions && (
          <Typography variant="caption" color="text.secondary">
            {normalizeActions.succeeded} of {normalizeActions.total} actions succeeded
          </Typography>
        )}
      </Stack>

      {job.phase === 'failed' && <JobErrorAlert job={job} goToStep={goToStep} />}

      {detail.isLoading && <Skeleton variant="rounded" height={48} sx={{ mt: 1.5 }} />}

      {detail.data && detail.data.staged_tables.length > 0 && (
        <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
          {detail.data.staged_tables.map((table) => (
            <TableHealthSection
              key={table.id}
              table={table}
              displayName={tableDisplayName(state, job, table)}
              onRejectedTotal={onRejectedTotal}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
