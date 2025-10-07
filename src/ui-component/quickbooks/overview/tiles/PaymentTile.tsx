import React from 'react';
import { Payment, TrendingUp, AttachMoney, Today } from '@mui/icons-material';
import BentoTile from './BentoTile';
import MetricDisplay from '../components/MetricDisplay';
import StatList, { StatItem } from '../components/StatList';

interface PaymentTileProps {
  data: {
    total: number;
    total_received: number;
    unapplied_amount: number;
    average_payment: number;
    todays_count: number;
    todays_amount: number;
  };
  loading?: boolean;
  onClick?: () => void;
}

const PaymentTile: React.FC<PaymentTileProps> = ({ data, loading = false, onClick }) => {
  const stats: StatItem[] = [
    {
      label: "Today's Payments",
      value: data.todays_count,
      icon: <Today sx={{ fontSize: 18 }} />,
      color: 'primary'
    },
    {
      label: "Today's Amount",
      value: data.todays_amount,
      format: 'currency',
      icon: <AttachMoney sx={{ fontSize: 18 }} />,
      color: 'success'
    },
    {
      label: 'Unapplied',
      value: data.unapplied_amount,
      format: 'currency',
      icon: <Payment sx={{ fontSize: 18 }} />,
      color: data.unapplied_amount > 0 ? 'warning' : 'success'
    },
    {
      label: 'Avg Payment',
      value: data.average_payment,
      format: 'currency',
      icon: <TrendingUp sx={{ fontSize: 18 }} />
    }
  ];

  return (
    <BentoTile title="Payments" variant="medium" colorScheme="payments" loading={loading} onClick={onClick}>
      <MetricDisplay value={data.total_received} label="Total Received" format="currency" size="large" />
      <StatList stats={stats} columns={2} divider />
    </BentoTile>
  );
};

export default PaymentTile;
