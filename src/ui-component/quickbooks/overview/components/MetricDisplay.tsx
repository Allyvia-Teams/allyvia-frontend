import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

interface MetricDisplayProps {
  value: number | string;
  label: string;
  format?: 'currency' | 'number' | 'percentage';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  size?: 'small' | 'medium' | 'large';
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

const MetricDisplay: React.FC<MetricDisplayProps> = ({ value, label, format = 'number', trend, size = 'medium' }) => {
  const theme = useTheme();

  const fontSize = {
    small: '1.5rem',
    medium: '2rem',
    large: '2.5rem'
  };

  const labelSize = {
    small: 'caption',
    medium: 'body2',
    large: 'body1'
  } as const;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
        <Typography
          sx={{
            fontSize: fontSize[size],
            fontWeight: 700,
            color: theme.palette.primary.main,
            lineHeight: 1
          }}
        >
          {formatValue(value, format)}
        </Typography>
        {trend && (
          <Chip
            size="small"
            icon={
              trend.direction === 'up' ? (
                <TrendingUp sx={{ fontSize: 14 }} />
              ) : trend.direction === 'down' ? (
                <TrendingDown sx={{ fontSize: 14 }} />
              ) : undefined
            }
            label={`${trend.value > 0 ? '+' : ''}${trend.value}%`}
            sx={{
              height: 20,
              backgroundColor:
                trend.direction === 'up'
                  ? theme.palette.success.light
                  : trend.direction === 'down'
                    ? theme.palette.error.light
                    : theme.palette.grey[200],
              color:
                trend.direction === 'up'
                  ? theme.palette.success.main
                  : trend.direction === 'down'
                    ? theme.palette.error.main
                    : theme.palette.grey[600],
              '& .MuiChip-icon': {
                color: 'inherit'
              }
            }}
          />
        )}
      </Box>
      <Typography variant={labelSize[size]} color="textSecondary">
        {label}
      </Typography>
    </Box>
  );
};

export default MetricDisplay;
