import React from 'react';
import { People, AccountBalance, CheckCircle, TrendingUp } from '@mui/icons-material';
import BentoTile from './BentoTile';
import MetricDisplay from '../components/MetricDisplay';
import StatList, { StatItem } from '../components/StatList';

interface CustomerTileProps {
  data: {
    total: number;
    active_count: number;
    total_outstanding: number;
    average_balance: number;
    with_balance_count: number;
  };
  loading?: boolean;
  onClick?: () => void;
}

const CustomerTile: React.FC<CustomerTileProps> = ({ data, loading = false, onClick }) => {
  const stats: StatItem[] = [
    {
      label: 'Active',
      value: data.active_count,
      icon: <CheckCircle sx={{ fontSize: 18 }} />,
      color: 'success'
    },
    {
      label: 'With Balance',
      value: data.with_balance_count,
      icon: <AccountBalance sx={{ fontSize: 18 }} />,
      color: 'info'
    },
    {
      label: 'Avg Balance',
      value: data.average_balance,
      format: 'currency',
      icon: <TrendingUp sx={{ fontSize: 18 }} />
    },
    {
      label: 'Outstanding',
      value: data.total_outstanding,
      format: 'currency',
      icon: <People sx={{ fontSize: 18 }} />,
      color: 'warning'
    }
  ];

  return (
    <BentoTile title="Customers" variant="small" colorScheme="customers" loading={loading} onClick={onClick}>
      <MetricDisplay value={data.total} label="Total Customers" format="number" size="medium" />
      <StatList stats={stats} columns={1} divider />
    </BentoTile>
  );
};

export default CustomerTile;
