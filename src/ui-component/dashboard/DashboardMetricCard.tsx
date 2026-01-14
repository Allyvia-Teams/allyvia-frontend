import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

interface MetricData {
  value: number;
  deltaPct: number | null;
  newPeriod?: boolean;
}

interface DashboardMetricCardProps {
  title: string;
  metric: MetricData;
  currency?: string;
  windowLabel: string;
  asOf?: string;
  format?: 'currency' | 'number';
}

const DashboardMetricCard: React.FC<DashboardMetricCardProps> = ({
  title,
  metric,
  currency = 'USD',
  windowLabel,
  asOf,
  format = 'currency',
}) => {
  const theme = useTheme();

  const formatValue = (value: number): string => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getDeltaColor = (deltaPct: number | null): string => {
    if (deltaPct === null) return theme.palette.grey[500];
    if (deltaPct > 0) return theme.palette.success.main;
    if (deltaPct < 0) return theme.palette.error.main;
    return theme.palette.grey[500];
  };

  const getDeltaIcon = (deltaPct: number | null) => {
    if (deltaPct === null) return null;
    if (deltaPct > 0) return <TrendingUp sx={{ fontSize: 14 }} />;
    if (deltaPct < 0) return <TrendingDown sx={{ fontSize: 14 }} />;
    return null;
  };

  const formatDelta = (deltaPct: number | null): string => {
    if (deltaPct === null) return 'New period';
    const sign = deltaPct > 0 ? '+' : '';
    return `${sign}${deltaPct.toFixed(1)}%`;
  };

  return (
    <Box
      sx={{
        p: 2.5,
        border: '1px solid',
        borderColor: theme.palette.divider,
        borderRadius: 2,
        backgroundColor: theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        height: '100%',
      }}
    >
      <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
        {title}
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            color: theme.palette.text.primary,
            lineHeight: 1.2,
          }}
        >
          {formatValue(metric.value)}
        </Typography>
        
        {metric.deltaPct !== null && (
          <Chip
            size="small"
            icon={getDeltaIcon(metric.deltaPct) || undefined}
            label={formatDelta(metric.deltaPct)}
            sx={{
              height: 24,
              backgroundColor: getDeltaColor(metric.deltaPct) + '20',
              color: getDeltaColor(metric.deltaPct),
              fontWeight: 500,
              '& .MuiChip-icon': {
                color: 'inherit',
              },
            }}
          />
        )}
        
        {metric.newPeriod && (
          <Chip
            size="small"
            label="New period"
            sx={{
              height: 24,
              backgroundColor: theme.palette.grey[200],
              color: theme.palette.grey[700],
              fontWeight: 500,
            }}
          />
        )}
      </Box>

      <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
        {windowLabel}
      </Typography>

      {asOf && (
        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
          as of {new Date(asOf).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </Typography>
      )}
    </Box>
  );
};

export default DashboardMetricCard;
