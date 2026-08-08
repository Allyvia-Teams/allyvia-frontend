// views/inventory/MovementHistory.tsx
//
// A variant's stock ledger: every change, why, who, and what it left behind.
//
// This is the screen that answers "where did those six go" — the question the
// whole ledger exists to make answerable. Reason labels and the em-dash-for-
// unknown rules live in stockFormat.ts and are tested there.

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';

import { Location, StockMovementRow, getItemMovements } from 'api/inventoryStock.api';

import { formatDelta, formatQuantity, formatUnitCost, movementTone, reasonLabel } from './stockFormat';

const REASON_OPTIONS = [
  'sale',
  'refund_restock',
  'po_receive',
  'transfer_out',
  'transfer_in',
  'count_adjust',
  'manual_adjust',
  'shrinkage',
  'initial'
];

const toneColor = (delta: number) => {
  const tone = movementTone(delta);
  if (tone === 'increase') return 'success.main';
  if (tone === 'decrease') return 'error.main';
  return 'text.secondary';
};

/** What caused a movement, as a link-ish label. Only sales carry a reference today. */
const sourceLabel = (row: StockMovementRow): string => {
  if (row.sale_receipt_number) return row.sale_receipt_number;
  if (row.note) return row.note;
  return '—';
};

export interface MovementHistoryProps {
  itemId: number;
  locations: Location[];
  /** Bumping this refetches — used after an adjustment lands. */
  refreshKey?: number;
}

export default function MovementHistory({ itemId, locations, refreshKey = 0 }: MovementHistoryProps) {
  const [rows, setRows] = useState<StockMovementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [locationId, setLocationId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getItemMovements(itemId, {
        page,
        pageSize: 25,
        locationId: locationId || null,
        reasons: reason ? [reason] : []
      });
      setRows(data.items);
      setTotalPages(data.pagination.total_pages || 1);
    } catch {
      setError('Could not load the movement history.');
    } finally {
      setLoading(false);
    }
  }, [itemId, page, locationId, reason]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        {locations.length > 1 && (
          <TextField
            select
            size="small"
            label="Location"
            value={locationId}
            onChange={(event) => {
              setLocationId(event.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All locations</MenuItem>
            {locations.map((location) => (
              <MenuItem key={location.id} value={location.id}>
                {location.name}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          select
          size="small"
          label="Reason"
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All reasons</MenuItem>
          {REASON_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {reasonLabel(option)}
            </MenuItem>
          ))}
        </TextField>

        <Box flexGrow={1} />
        {loading && <CircularProgress size={18} />}
      </Stack>

      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>When</TableCell>
              <TableCell>What happened</TableCell>
              <TableCell align="right">Change</TableCell>
              <TableCell align="right">On hand after</TableCell>
              <TableCell align="right">Unit cost</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    No movements match these filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip size="small" variant="outlined" label={reasonLabel(row.reason)} />
                </TableCell>
                <TableCell align="right" sx={{ color: toneColor(row.delta), fontWeight: 600 }}>
                  {formatDelta(row.delta)}
                </TableCell>
                <TableCell align="right">{formatQuantity(row.quantity_after)}</TableCell>
                <Tooltip
                  title={
                    row.unit_cost === null
                      ? 'Cost was not known when this movement was recorded'
                      : 'The cost of these units at the time they moved'
                  }
                >
                  <TableCell align="right">{formatUnitCost(row.unit_cost)}</TableCell>
                </Tooltip>
                <TableCell>{row.location_name ?? '—'}</TableCell>
                <TableCell>{sourceLabel(row)}</TableCell>
                <TableCell>{row.performed_by_email || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Stack direction="row" justifyContent="flex-end">
          <Pagination size="small" count={totalPages} page={page} onChange={(_event, value) => setPage(value)} />
        </Stack>
      )}
    </Stack>
  );
}
