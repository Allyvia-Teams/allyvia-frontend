import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { useTheme } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const TopExpenses: React.FC = () => {
  const theme = useTheme();
  const { topExpenses } = useSelector((state: RootState) => (state as any).finance);
  const loading = useSelector((state: RootState) => (state as any).finance.loading.topExpenses);

  const topExpensesList = Array.isArray(topExpenses) ? topExpenses : [];

  return (
    <AllyviaEmpty isLoading={loading} isEmpty={false} type="list" skeletonType="list" height={0} width="100%" sx={{ p: 0, height: 'auto' }}>
      <MainCard title="Top Expenses">
        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
          {topExpensesList.length > 0 ? (
            topExpensesList.slice(0, 10).map((expense: any, index: number) => (
              <div
                key={expense.id || index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: index < 9 ? `1px solid ${theme.palette.divider}` : 'none'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'medium', fontSize: '14px' }}>
                    {expense.description || expense.category || `Expense ${index + 1}`}
                  </div>
                  <div style={{ fontSize: '12px', color: theme.palette.text.secondary }}>{expense.category || 'Uncategorized'}</div>
                </div>
                <div style={{ fontWeight: 'bold', color: theme.palette.error.main }}>{fmtMoney(expense.amount || 0)}</div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: theme.palette.text.secondary, padding: '20px' }}>No expense data available</div>
          )}
        </div>
      </MainCard>
    </AllyviaEmpty>
  );
};

export default TopExpenses;
