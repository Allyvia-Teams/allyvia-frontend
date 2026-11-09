import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  Menu,
  MenuItem,
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
import { IconChevronDown, IconPlus, IconX } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { expenseCatalogueAPI } from 'api/expenseCatalogue.api';
import FinanceAPI from 'api/finance.api';
import MainCard from 'ui-component/cards/MainCard';
import { AlertStrip } from 'ui-component/frame';
import ExpenseCatalogue, { type CatalogueSection } from '../ExpenseCatalogue';
import { billBalances, categoryTotal, recentExpenses } from '../expensesView';
import { expenseCoverageNote } from '../statementsView';
import { EXPENSE_CATEGORIES_KEY, useExpenseCategories, useFinanceWindow } from '../useExpenseCategories';

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
// A report date is a plain YYYY-MM-DD; read it as a local day so it never shifts.
const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : iso;
};

type Tool = { section: CatalogueSection; add?: boolean; title: string };
const TOOLS: Tool[] = [
  { section: 'expenses', add: true, title: 'Add expense' },
  { section: 'inbox', title: 'Upload invoice' },
  { section: 'recurring', title: 'Monthly bills' },
  { section: 'expenses', title: 'Manage expenses' }
];

const ExpensesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { companyId, startISO, endISO } = useFinanceWindow();
  const { query: categories, rows } = useExpenseCategories();
  const reportKey = ['finance', 'expense-report', companyId, startISO, endISO];
  const report = useQuery({
    queryKey: reportKey,
    queryFn: () => expenseCatalogueAPI(companyId as string).report({ start_date: startISO, end_date: endISO }),
    enabled: !!companyId && !!startISO && !!endISO
  });
  const bills = useQuery({
    queryKey: ['finance', 'expense-report', 'bills', companyId, startISO, endISO],
    queryFn: () => FinanceAPI.Expense.getBills({ companyId: companyId as string, startDate: startISO, endDate: endISO, pageSize: 200 }),
    enabled: !!companyId && !!startISO && !!endISO
  });
  const recent = recentExpenses(report.data?.records, 10, billBalances(bills.data));
  const coverage = expenseCoverageNote(report.data?.coverage);

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: EXPENSE_CATEGORIES_KEY });
    void queryClient.invalidateQueries({ queryKey: ['finance', 'expense-report'] });
  };

  return (
    <>
      <MainCard
        title={
          <Stack direction="row" alignItems="baseline" spacing={1.5}>
            <Typography variant="h3" component="span">
              Expenses
            </Typography>
            <Typography variant="h3" component="span" color="text.secondary">
              {categories.isLoading ? '' : money(categoryTotal(rows))}
            </Typography>
          </Stack>
        }
        secondary={
          <Button
            variant="contained"
            startIcon={<IconPlus size={16} />}
            endIcon={<IconChevronDown size={16} />}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            Add expense
          </Button>
        }
      >
        {coverage.conflict && (
          <AlertStrip
            title="QuickBooks and Xero are both connected."
            body="Choose one in Settings so expenses can be read."
            action={{ label: 'Choose', to: '/settings?tab=integrations' }}
          />
        )}
        {categories.isLoading ? (
          <Skeleton aria-label="Loading expenses" height={160} />
        ) : categories.isError ? (
          <Typography color="text.secondary">
            Couldn't load expenses. <Button onClick={() => categories.refetch()}>Retry</Button>
          </Typography>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary">No expenses in this period.</Typography>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Expenses by category">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell align="right">{money(row.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {coverage.note && (
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5 }}>
            {coverage.note}
          </Typography>
        )}
      </MainCard>

      <MainCard title="Recent expenses" sx={{ mt: 2 }}>
        {report.isLoading ? (
          <Skeleton aria-label="Loading recent expenses" height={120} />
        ) : report.isError ? (
          <Typography color="text.secondary">
            Couldn't load recent expenses. <Button onClick={() => report.refetch()}>Retry</Button>
          </Typography>
        ) : recent.length === 0 ? (
          <Typography color="text.secondary">No expenses in this period.</Typography>
        ) : (
          <Table size="small" aria-label="Recent expenses">
            <TableBody>
              {recent.map((row) => (
                <TableRow key={row.key}>
                  <TableCell sx={{ width: 80, color: 'text.secondary', whiteSpace: 'nowrap' }}>{shortDate(row.date)}</TableCell>
                  <TableCell>{row.payee}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {row.unpaid && <Chip label="Unpaid" size="small" sx={{ mr: 1 }} />}
                    {money(row.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </MainCard>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        {TOOLS.map((t) => (
          <MenuItem
            key={t.title}
            onClick={() => {
              setMenuAnchor(null);
              setTool(t);
            }}
          >
            {t.title}
          </MenuItem>
        ))}
      </Menu>

      <Drawer
        anchor="right"
        open={!!tool}
        onClose={() => {
          setTool(null);
          refresh();
        }}
        PaperProps={{ sx: { width: { xs: '100%', md: 720 } } }}
      >
        {tool && (
          <Box sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="h3">{tool.title}</Typography>
              <IconButton
                aria-label="Close"
                onClick={() => {
                  setTool(null);
                  refresh();
                }}
              >
                <IconX size={18} />
              </IconButton>
            </Stack>
            <ExpenseCatalogue
              key={tool.title}
              manage={tool.section}
              startAdd={tool.add}
              startDate={startISO}
              endDate={endISO}
              onChanged={refresh}
            />
          </Box>
        )}
      </Drawer>
    </>
  );
};

export default ExpensesTab;
