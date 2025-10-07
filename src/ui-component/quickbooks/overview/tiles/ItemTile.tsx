import React from 'react';
import { Inventory, Warning, CheckCircle, AttachMoney } from '@mui/icons-material';
import BentoTile from './BentoTile';
import MetricDisplay from '../components/MetricDisplay';
import StatList, { StatItem } from '../components/StatList';

interface ItemTileProps {
  data: {
    total: number;
    active_count: number;
    low_stock_count: number;
    total_value: number;
  };
  loading?: boolean;
  onClick?: () => void;
}

const ItemTile: React.FC<ItemTileProps> = ({ data, loading = false, onClick }) => {
  const stats: StatItem[] = [
    {
      label: 'Active Items',
      value: data.active_count,
      icon: <CheckCircle sx={{ fontSize: 18 }} />,
      color: 'success'
    },
    {
      label: 'Low Stock',
      value: data.low_stock_count,
      icon: <Warning sx={{ fontSize: 18 }} />,
      color: data.low_stock_count > 0 ? 'warning' : 'success'
    },
    {
      label: 'Inventory Value',
      value: data.total_value,
      format: 'currency',
      icon: <AttachMoney sx={{ fontSize: 18 }} />
    }
  ];

  return (
    <BentoTile title="Inventory" variant="small" colorScheme="items" loading={loading} onClick={onClick}>
      <MetricDisplay value={data.total} label="Total Items" format="number" size="medium" />
      <StatList stats={stats} columns={1} divider />
    </BentoTile>
  );
};

export default ItemTile;
