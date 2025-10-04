import React from 'react';
import { Receipt, Warning, CheckCircle, Schedule } from '@mui/icons-material';
import BentoTile from './BentoTile';
import MetricDisplay from '../components/MetricDisplay';
import StatList, { StatItem } from '../components/StatList';

interface InvoiceTileProps {
  data: {
    total: number;
    unpaid_count: number;
    overdue_count: number;
    paid_count: number;
    total_amount: number;
    outstanding_balance: number;
  };
  loading?: boolean;
  onClick?: () => void;
}

const InvoiceTile: React.FC<InvoiceTileProps> = ({ data, loading = false, onClick }) => {
  const stats: StatItem[] = [
    {
      label: 'Unpaid',
      value: data.unpaid_count,
      icon: <Schedule sx={{ fontSize: 18 }} />,
      color: 'info'
    },
    {
      label: 'Overdue',
      value: data.overdue_count,
      icon: <Warning sx={{ fontSize: 18 }} />,
      color: data.overdue_count > 0 ? 'error' : 'success'
    },
    {
      label: 'Paid',
      value: data.paid_count,
      icon: <CheckCircle sx={{ fontSize: 18 }} />,
      color: 'success'
    },
    {
      label: 'Total Amount',
      value: data.total_amount,
      format: 'currency',
      icon: <Receipt sx={{ fontSize: 18 }} />
    }
  ];

  return (
    <BentoTile title="Invoices" variant="medium" colorScheme="invoices" loading={loading} onClick={onClick}>
      <MetricDisplay value={data.outstanding_balance} label="Outstanding Balance" format="currency" size="large" />
      <StatList stats={stats} columns={2} divider />
    </BentoTile>
  );
};

export default InvoiceTile;
