import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import { Box, Typography, Chip } from '@mui/material';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const FinanceOverduePending: React.FC = () => {
  const { invoiceList } = useSelector((state: RootState) => (state as any).finance);

  // Handle both array and paginated response structures
  const invoices = Array.isArray(invoiceList) ? invoiceList : Array.isArray(invoiceList?.items) ? invoiceList.items : [];

  // Filter for overdue and pending invoices - check multiple possible status values
  let overdue = invoices.filter(
    (inv: any) =>
      inv.status === 'overdue' ||
      inv.status === 'Overdue' ||
      inv.status === 'OVERDUE' ||
      (inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid')
  );

  let pending = invoices.filter(
    (inv: any) =>
      inv.status === 'pending' ||
      inv.status === 'Pending' ||
      inv.status === 'PENDING' ||
      inv.status === 'unpaid' ||
      inv.status === 'Unpaid' ||
      inv.status === 'UNPAID'
  );

  let combined = [...overdue, ...pending].slice(0, 10);

  return (
    <MainCard title="Overdue & Pending Invoices">
      <Box sx={{ p: 2 }}>
        {combined.length === 0 ? (
          <Typography color="textSecondary" sx={{ textAlign: 'center' }}>
            No overdue or pending invoices
          </Typography>
        ) : (
          combined.map((inv: any, index: number) => (
            <Box
              key={inv.id || index}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1.5,
                p: 1.5,
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {inv.customer_name || inv.customer || inv.client || `Invoice ${inv.doc_number || inv.id}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Due: {inv.due_date || inv.dueDate || '—'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" fontWeight="bold" color={inv.status === 'overdue' ? 'error.main' : 'warning.main'}>
                  {fmtMoney(inv.total_amount || inv.amount || inv.balance || 0)}
                </Typography>
                <Chip
                  label={(inv.status || '').toUpperCase()}
                  size="small"
                  color={inv.status === 'overdue' ? 'warning' : 'info'}
                  variant="outlined"
                />
              </Box>
            </Box>
          ))
        )}
      </Box>
    </MainCard>
  );
};

export default FinanceOverduePending;
