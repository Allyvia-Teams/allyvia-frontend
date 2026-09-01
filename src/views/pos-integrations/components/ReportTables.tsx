// The reconciliation tables: totals, gross sales, sales by month, inventory.
//
// The monthly table is the one CONTEXT calls "the check merchants actually
// trust", and it earns that: nobody knows offhand whether 1,000 orders is
// right, but everybody knows what March looked like. It is therefore given the
// most room and the plainest numbers.

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import type { GrossSalesRow, InventoryRow, MonthlyRow, PostCommitSection, TotalsRow } from 'api/posIntegrations.api';
import { ENTITY_LABELS } from 'api/posIntegrations.api';
import StatusChip from './StatusChip';

const dash = (value: string | number | null | undefined) => (value === null || value === undefined || value === '' ? '—' : String(value));

/** Marks a figure we computed ourselves rather than one the source asserted. */
function DerivedMark({ derived }: { derived?: boolean }) {
  if (!derived) return null;
  return (
    <Tooltip title="We counted this from the file you uploaded — the source can’t report an independent total.">
      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
        *
      </Typography>
    </Tooltip>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export function TotalsTable({ rows }: { rows: TotalsRow[] }) {
  if (!rows.length) return null;
  // Once a run has committed, records move from "valid" to "committed", so a
  // fixed "Ready" column would read 0 across the board on a finished import —
  // which looks like nothing arrived. Swap the column for what actually
  // happened.
  const imported = rows.some((row) => row.committed > 0);
  return (
    <Section title="Record counts">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell align="right">In your export</TableCell>
              <TableCell align="right">Read</TableCell>
              <TableCell align="right">{imported ? 'Imported' : 'Ready'}</TableCell>
              <TableCell align="right">Problems</TableCell>
              <TableCell align="right">Skipped</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.entity} hover>
                <TableCell>{ENTITY_LABELS[row.entity] ?? row.entity}</TableCell>
                <TableCell align="right">
                  {dash(row.source)}
                  <DerivedMark derived={row.source_derived} />
                </TableCell>
                <TableCell align="right">{row.staged}</TableCell>
                <TableCell align="right">{imported ? row.committed : row.valid}</TableCell>
                <TableCell align="right">
                  {row.invalid ? (
                    <Typography component="span" color="error.main">
                      {row.invalid}
                    </Typography>
                  ) : (
                    0
                  )}
                </TableCell>
                <TableCell align="right">{row.skipped ?? 0}</TableCell>
                <TableCell align="right">
                  <StatusChip status={row.status} note={row.note} compact />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Section>
  );
}

export function GrossSalesTable({ rows }: { rows: GrossSalesRow[] }) {
  if (!rows.length) return null;
  return (
    <Section title="Total sales">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Currency</TableCell>
              <TableCell align="right">In your export</TableCell>
              <TableCell align="right">Read</TableCell>
              <TableCell align="right">Difference</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.currency} hover>
                <TableCell>{row.currency}</TableCell>
                <TableCell align="right">
                  {dash(row.source)}
                  <DerivedMark derived={row.source_derived} />
                </TableCell>
                <TableCell align="right">{row.staged}</TableCell>
                <TableCell align="right">{dash(row.delta)}</TableCell>
                <TableCell align="right">
                  <StatusChip status={row.status} note={row.note} compact />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Section>
  );
}

export function MonthlySalesTable({ rows }: { rows: MonthlyRow[] }) {
  if (!rows.length) return null;
  return (
    <Section title="Sales by month">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        The quickest way to tell whether your history came across intact — these should look like your months.
      </Typography>
      <TableContainer sx={{ maxHeight: 420 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell align="right">Orders</TableCell>
              <TableCell align="right">In your export</TableCell>
              <TableCell align="right">Read</TableCell>
              <TableCell align="right">Difference</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.month} hover>
                <TableCell>{row.month}</TableCell>
                <TableCell align="right">{row.staged_orders}</TableCell>
                <TableCell align="right">
                  {dash(row.source)}
                  <DerivedMark derived={row.source_derived} />
                </TableCell>
                <TableCell align="right">{row.staged}</TableCell>
                <TableCell align="right">{dash(row.delta)}</TableCell>
                <TableCell align="right">
                  <StatusChip status={row.status} compact />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Section>
  );
}

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  if (!rows.length) return null;
  return (
    <Section title="Stock by location">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Location</TableCell>
              <TableCell align="right">In your export</TableCell>
              <TableCell align="right">Read</TableCell>
              <TableCell align="right">Difference</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.location} hover>
                <TableCell>{row.location}</TableCell>
                <TableCell align="right">{dash(row.source)}</TableCell>
                <TableCell align="right">{row.staged}</TableCell>
                <TableCell align="right">{dash(row.delta)}</TableCell>
                <TableCell align="right">
                  <StatusChip status={row.status} compact />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Section>
  );
}

export function PostCommitTable({ section }: { section: PostCommitSection }) {
  return (
    <Section title="After importing">
      <Stack spacing={1}>
        <Alert severity={section.ok ? 'success' : 'error'}>
          {section.ok
            ? 'We counted everything again after importing, and it all arrived.'
            : 'The counts after importing don’t match what we expected. This import may be incomplete — please contact support before relying on this data.'}
        </Alert>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell align="right">Imported</TableCell>
                <TableCell align="right">Now in Allyvia</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {section.rows.map((row) => (
                <TableRow key={row.entity} hover>
                  <TableCell>{ENTITY_LABELS[row.entity] ?? row.entity}</TableCell>
                  <TableCell align="right">{row.committed}</TableCell>
                  <TableCell align="right">{dash(row.live)}</TableCell>
                  <TableCell align="right">
                    <StatusChip status={row.status} note={row.note} compact />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Section>
  );
}
