import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import { Box, Typography, Chip } from '@mui/material';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const FinanceOverduePending: React.FC = () => {
  const { invoiceList } = useSelector((state: RootState) => (state as any).finance);

  // Ensure invoiceList is always an array
  const invoices = Array.isArray(invoiceList) ? invoiceList : [];

  let overdue = invoices.filter((inv: any) => inv.status === 'overdue');
  let pending = invoices.filter((inv: any) => inv.status === 'pending');
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
                  {inv.customer || inv.client || inv.id}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Due: {inv.due_date || inv.dueDate || '—'}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" fontWeight="bold" color={inv.status === 'overdue' ? 'error.main' : 'warning.main'}>
                  {fmtMoney(inv.amount || inv.balance || 0)}
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
