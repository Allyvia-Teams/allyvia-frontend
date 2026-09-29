import { Alert, Box, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { ExpenseRecognition } from 'types/expenseCatalogue';
import { expenseRecognitionRows } from './expenseRecognitionView';

const sourceLabels: Record<string, string> = {
  manual_csv: 'Manual and CSV entries',
  vendor_bills: 'Vendor bills',
  quickbooks: 'QuickBooks',
  payroll: 'Payroll provider',
  processing_fees: 'Payment processing fees',
  bank_card_feeds: 'Bank and card feeds'
};

export default function ExpenseRecognitionPanel({ data, loading = false }: { data?: ExpenseRecognition | null; loading?: boolean }) {
  const rows = expenseRecognitionRows(data?.currencies);
  const missing = data?.coverage.filter((source) => !source.available) ?? [];
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Recorded expenses
      </Typography>
      {loading ? (
        <Skeleton aria-label="Loading recorded expenses" height={120} />
      ) : !data ? (
        <Alert severity="info">The expense breakdown is not available for this period.</Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {data.start_date} to {data.end_date}. Costs, payments, and outstanding amounts are shown separately for each currency.
          </Typography>
          {(!data.complete || missing.length > 0) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Partial expense coverage. Some business costs may be missing.
            </Alert>
          )}
          {rows.length === 0 ? (
            <Typography>No expenses recorded for this period.</Typography>
          ) : (
            <TableContainer>
              <Table size="small" aria-label="Recorded expenses by currency">
                <TableHead>
                  <TableRow>
                    <TableCell>Currency</TableCell>
                    <TableCell align="right">Operating costs</TableCell>
                    <TableCell align="right">Cash paid</TableCell>
                    <TableCell align="right">Outstanding</TableCell>
                    <TableCell align="right">Unclassified</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.currency}>
                      <TableCell component="th" scope="row">
                        {row.currency}
                      </TableCell>
                      <TableCell align="right">{row.recognized}</TableCell>
                      <TableCell align="right">{row.paid}</TableCell>
                      <TableCell align="right">{row.outstanding}</TableCell>
                      <TableCell align="right">{row.unclassified}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Cash paid includes inventory and other purchases that are not operating costs. Outstanding amounts are recorded commitments, not
            total debt. Net income shown on this page has not been recalculated from these costs.
          </Typography>
          {missing.length > 0 && (
            <Box component="ul" sx={{ mb: 0, pl: 2.5 }}>
              {missing.map((source) => (
                <li key={source.source}>
                  <Typography variant="body2">
                    <strong>{sourceLabels[source.source] ?? source.source.replaceAll('_', ' ')}</strong>:{' '}
                    {source.detail || 'Not included automatically.'}
                  </Typography>
                </li>
              ))}
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}
