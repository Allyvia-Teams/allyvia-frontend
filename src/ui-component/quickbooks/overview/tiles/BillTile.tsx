import React from 'react';
import { Receipt, Warning, CheckCircle, Schedule } from '@mui/icons-material';
import BentoTile from './BentoTile';
import MetricDisplay from '../components/MetricDisplay';
import StatList, { StatItem } from '../components/StatList';

interface BillTileProps {
  data: {
    total: number;
    unpaid_count: number;
    overdue_count: number;
    paid_count: number;
    total_amount: number;
    total_balance: number;
  };
  loading?: boolean;
  onClick?: () => void;
}

const BillTile: React.FC<BillTileProps> = ({ data, loading = false, onClick }) => {
  const stats: StatItem[] = [
    {
      label: 'Unpaid',
      value: data.unpaid_count,
      icon: <Schedule sx={{ fontSize: 18 }} />,
      color: 'warning'
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
    }
  ];

  return (
    <BentoTile title="Bills" variant="small" colorScheme="bills" loading={loading} onClick={onClick}>
      <MetricDisplay value={data.total_balance} label="Total Due" format="currency" size="medium" />
      <StatList stats={stats} columns={1} divider />
    </BentoTile>
  );
};

export default BillTile;
