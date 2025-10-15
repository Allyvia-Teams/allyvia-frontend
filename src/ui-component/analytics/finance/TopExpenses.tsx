import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const TopExpenses: React.FC = () => {
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
                  borderBottom: index < 9 ? '1px solid #e0e0e0' : 'none'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'medium', fontSize: '14px' }}>
                    {expense.description || expense.category || `Expense ${index + 1}`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{expense.category || 'Uncategorized'}</div>
                </div>
                <div style={{ fontWeight: 'bold', color: '#d32f2f' }}>{fmtMoney(expense.amount || 0)}</div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No expense data available</div>
          )}
        </div>
      </MainCard>
    </AllyviaEmpty>
  );
};

export default TopExpenses;
