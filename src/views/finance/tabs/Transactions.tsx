import React from 'react';
import { Grid, Divider, Typography, Paper } from '@mui/material';
import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import {
  AllyviaPaginatedTable,
  FINANCE_COLUMN_CONFIGS,
  getFinanceRowClassName,
  getFinanceCustomStyles
} from 'ui-component/common/AllyviaPaginatedTable';
import type { InvoiceRow, Expense, LedgerRow } from 'types/finance';

interface TransactionsTabProps {
  invoices: InvoiceRow[];
  expenses: Expense[];
  ledger: LedgerRow[];
  invoiceSummary: {
    totalAmt: number;
    count: number;
    paid: number;
    pending: number;
    overdue: number;
    avg: number;
  };
  startISO: string;
  endISO: string;
}

const TransactionsTab: React.FC<TransactionsTabProps> = ({ invoices, expenses, ledger, invoiceSummary, startISO, endISO }) => {
  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const expenseSummary = {
    totalAmt: expenses.reduce((sum, exp) => sum + exp.amount, 0),
    count: expenses.length,
    avg: expenses.length > 0 ? expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length : 0,
    topCategory:
      expenses.length > 0
        ? Object.entries(
            expenses.reduce(
              (acc, exp) => {
                acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
                return acc;
              },
              {} as Record<string, number>
            )
          ).sort(([, a], [, b]) => b - a)[0]?.[0]
        : '—',
    categories: expenses.reduce(
      (acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      },
      {} as Record<string, number>
    )
  };

  const ledgerSummary = {
    debits: ledger.reduce((sum, row) => sum + row.debit, 0),
    credits: ledger.reduce((sum, row) => sum + row.credit, 0),
    balanced: Math.abs(ledger.reduce((sum, row) => sum + row.debit - row.credit, 0)) < 0.01
  };

  return (
    <>
      {/* Invoices Summary */}
      <Grid container spacing={gridSpacing} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TotalIncomeDarkCard
            showIcon={false}
            height={88}
            value={fmtMoney(invoiceSummary.totalAmt)}
            title="Total Invoices"
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TotalIncomeDarkCard showIcon={false} height={88} value={invoiceSummary.count} title="Invoice Count" isTaggable={false} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TotalIncomeDarkCard
            showIcon={false}
            height={88}
            value={fmtMoney(Math.round(invoiceSummary.avg || 0))}
            title="Average Invoice"
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TotalIncomeDarkCard showIcon={false} height={88} value={invoiceSummary.paid} title="Paid" isTaggable={false} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TotalIncomeDarkCard showIcon={false} height={88} value={invoiceSummary.pending} title="Pending" isTaggable={false} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <TotalIncomeDarkCard showIcon={false} height={88} value={invoiceSummary.overdue} title="Overdue" isTaggable={false} />
        </Grid>
      </Grid>

      {/* Invoices Table */}
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12 }}>
          <MainCard title="Invoices" secondary={<Typography variant="caption">Filtered by date range</Typography>}>
            <Paper variant="outlined">
              <AllyviaPaginatedTable
                rows={invoices}
                columns={FINANCE_COLUMN_CONFIGS.invoices}
                showPagination={true}
                getRowClassName={getFinanceRowClassName('invoices')}
                customStyles={getFinanceCustomStyles('invoices')}
              />
            </Paper>
          </MainCard>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Expenses Summary */}
      <Grid container spacing={gridSpacing} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            showIcon={false}
            height={88}
            value={fmtMoney(expenseSummary.totalAmt)}
            title="Total Expenses"
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            showIcon={false}
            height={88}
            value={fmtMoney(Math.round(expenseSummary.avg || 0))}
            title="Average Expense"
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            showIcon={false}
            height={88}
            value={expenseSummary.topCategory ?? '—'}
            title="Top Category"
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            showIcon={false}
            height={88}
            value={`${Object.entries(expenseSummary.categories).length} categories`}
            title="Categories"
            isTaggable={false}
          />
        </Grid>
      </Grid>

      {/* Expenses Table */}
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12 }}>
          <MainCard title="Expenses" secondary={<Typography variant="caption">Filtered by date range</Typography>}>
            <Paper variant="outlined">
              <AllyviaPaginatedTable
                rows={expenses}
                columns={FINANCE_COLUMN_CONFIGS.expenses}
                showPagination={true}
                getRowClassName={getFinanceRowClassName('expenses')}
                customStyles={getFinanceCustomStyles('expenses')}
              />
            </Paper>
          </MainCard>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Ledger Summary */}
      <Grid container spacing={gridSpacing} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            showIcon={false}
            height={88}
            value={fmtMoney(ledgerSummary.debits)}
            title="Total Debits"
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            showIcon={false}
            height={88}
            value={fmtMoney(ledgerSummary.credits)}
            title="Total Credits"
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard
            showIcon={false}
            height={88}
            value={ledgerSummary.balanced ? 'Yes' : 'No'}
            title="Balanced"
            isTaggable={false}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TotalIncomeDarkCard showIcon={false} height={88} value={String(ledger.length)} title="Total Entries" isTaggable={false} />
        </Grid>
      </Grid>

      {/* Ledger Table */}
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12 }}>
          <MainCard title="General Ledger" secondary={<Typography variant="caption">Filtered by date range</Typography>}>
            <Paper variant="outlined">
              <AllyviaPaginatedTable
                rows={ledger}
                columns={FINANCE_COLUMN_CONFIGS.ledger}
                showPagination={true}
                getRowClassName={getFinanceRowClassName('ledger')}
                customStyles={getFinanceCustomStyles('ledger')}
              />
            </Paper>
          </MainCard>
        </Grid>
      </Grid>
    </>
  );
};

export default TransactionsTab;
