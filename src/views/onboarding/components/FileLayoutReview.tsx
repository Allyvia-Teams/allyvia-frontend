import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { StagedTableSummary } from 'api/onboarding.api';
import { useParsePreview } from '../hooks/useOnboardingQueries';
import { headerChoice } from '../layout';
import { needsHeaderDecision } from '../mapping';

interface Props {
  table: StagedTableSummary;
  disabled: boolean;
  onApply: (choice: { forceHeader: boolean; headerRow?: number }) => void;
}

export default function FileLayoutReview({ table, disabled, onApply }: Props) {
  const [open, setOpen] = useState(needsHeaderDecision(table.header_info));
  const [choice, setChoice] = useState(
    table.header_info?.header_row
      ? String(table.header_info.header_row)
      : table.header_info?.forced && !table.header_info.detected
        ? 'none'
        : ''
  );
  const preview = useParsePreview(table.id, open);
  const decision = headerChoice(choice, preview.data);

  return (
    <Stack spacing={1.5}>
      <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} disabled={disabled} onClick={() => setOpen(!open)}>
        {open ? 'Hide file layout' : 'Review header row or choose no headers'}
      </Button>
      {open && (
        <>
          <Typography variant="body2">
            Choose the row containing column names. Rows above it will be excluded. Choose “No headers” to keep the first row as data.
            Applying a layout replaces your unconfirmed column mappings.
          </Typography>
          {preview.isPending && <Typography role="status">Reading source rows…</Typography>}
          {preview.isError && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" onClick={() => preview.refetch()}>
                  Retry
                </Button>
              }
            >
              {(preview.error as any)?.response?.data?.detail || 'Could not read the source rows. Please retry.'}
            </Alert>
          )}
          {preview.data && (
            <>
              <TextField select label="Header row" value={choice} disabled={disabled} onChange={(event) => setChoice(event.target.value)}>
                <MenuItem value="">Choose a row</MenuItem>
                <MenuItem value="none">No headers — every row contains data</MenuItem>
                {preview.data.rows.map((row) => (
                  <MenuItem key={row.row_number} value={String(row.row_number)} disabled={!row.selectable}>
                    Row {row.row_number}:{' '}
                    {row.values
                      .slice(0, 3)
                      .map((value) => value.slice(0, 40) || '(empty)')
                      .join(' · ') || '(blank row)'}
                  </MenuItem>
                ))}
              </TextField>
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" aria-label="Source rows for header selection">
                  <TableHead>
                    <TableRow>
                      <TableCell>Source row</TableCell>
                      <TableCell>Values (first six columns)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.data.rows.map((row) => (
                      <TableRow key={row.row_number} selected={choice === String(row.row_number)}>
                        <TableCell>{row.row_number}</TableCell>
                        <TableCell sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                          {row.values
                            .slice(0, 6)
                            .map((value) => value || '(empty)')
                            .join(' | ') || '(blank row)'}
                          {(row.truncated || row.values.length > 6) && ' …'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" color="text.secondary">
                {preview.data.limited ? 'Showing a limited preview of the first source rows. ' : ''}A line break inside a quoted cell
                remains part of the same row.
              </Typography>
              <Button
                variant="contained"
                disabled={disabled || !decision}
                onClick={() => decision && onApply(decision)}
                sx={{ alignSelf: 'flex-start' }}
              >
                {disabled ? 'Applying…' : 'Apply file layout'}
              </Button>
            </>
          )}
        </>
      )}
    </Stack>
  );
}
