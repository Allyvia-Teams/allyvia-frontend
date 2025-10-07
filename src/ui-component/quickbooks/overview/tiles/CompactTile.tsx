import React from 'react';
import { Box, Typography } from '@mui/material';
import BentoTile from './BentoTile';
import { useTheme } from '@mui/material/styles';

interface CompactTileProps {
  title: string;
  primaryValue: number | string;
  primaryLabel: string;
  secondaryValue?: number | string;
  secondaryLabel?: string;
  format?: 'currency' | 'number' | 'percentage';
  loading?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  colorScheme:
    | 'payments'
    | 'invoices'
    | 'bills'
    | 'customers'
    | 'vendors'
    | 'accounts'
    | 'items'
    | 'billpayments'
    | 'vendorcredits'
    | 'purchases';
}

const formatValue = (value: number | string, format?: string): string => {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
};

const CompactTile: React.FC<CompactTileProps> = ({
  title,
  primaryValue,
  primaryLabel,
  secondaryValue,
  secondaryLabel,
  format = 'number',
  loading = false,
  onClick,
  icon,
  colorScheme
}) => {
  const theme = useTheme();

  return (
    <BentoTile title={title} variant="small" colorScheme={colorScheme} loading={loading} onClick={onClick}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {icon && <Box sx={{ color: theme.palette.primary.main, display: 'flex' }}>{icon}</Box>}
            <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
              {formatValue(primaryValue, format)}
            </Typography>
          </Box>
          <Typography variant="caption" color="textSecondary">
            {primaryLabel}
          </Typography>
        </Box>

        {secondaryValue !== undefined && secondaryLabel && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 500 }}>
              {formatValue(secondaryValue, format)}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {secondaryLabel}
            </Typography>
          </Box>
        )}
      </Box>
    </BentoTile>
  );
};

export default CompactTile;
