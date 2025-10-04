import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export interface StatItem {
  label: string;
  value: number | string;
  format?: 'currency' | 'number' | 'percentage';
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

interface StatListProps {
  stats: StatItem[];
  columns?: 1 | 2;
  divider?: boolean;
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

const StatList: React.FC<StatListProps> = ({ stats, columns = 1, divider = false }) => {
  const theme = useTheme();

  return (
    <Box>
      {divider && <Divider sx={{ mb: 2 }} />}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: columns === 2 ? 'repeat(2, 1fr)' : '1fr',
          gap: 1.5
        }}
      >
        {stats.map((stat, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            {stat.icon && (
              <Box
                sx={{
                  color: stat.color ? theme.palette[stat.color].main : theme.palette.text.secondary,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {stat.icon}
              </Box>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {stat.label}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: stat.color ? theme.palette[stat.color].main : theme.palette.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {formatValue(stat.value, stat.format)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default StatList;
