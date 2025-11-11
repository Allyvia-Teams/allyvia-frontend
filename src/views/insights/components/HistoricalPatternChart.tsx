import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';
import { SalesTrendsAnalysis } from 'types/analytics';

interface HistoricalPatternChartProps {
  data: SalesTrendsAnalysis;
  selectedPeriod: string;
}

export default function HistoricalPatternChart({ data, selectedPeriod }: HistoricalPatternChartProps) {
  const calculatePatterns = () => {
    if (!data.daily_breakdown || data.daily_breakdown.length === 0) {
      return data.patterns?.sales_by_day || [];
    }

    const dayGroups: Record<string, number[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    };

    data.daily_breakdown.forEach((day) => {
      const date = new Date(day.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      if (dayGroups[dayName]) {
        dayGroups[dayName].push(day.units);
      }
    });

    return Object.entries(dayGroups).map(([day, units]) => {
      if (units.length === 0) {
        return { day, median_units: 0, mean_units: 0, std_dev: 0, variance_pct: 0 };
      }

      const sum = units.reduce((acc, val) => acc + val, 0);
      const mean = sum / units.length;

      return {
        day,
        median_units: mean,
        mean_units: mean,
        std_dev: 0,
        variance_pct: 0
      };
    });
  };

  const calculateBaseline = () => {
    if (!data.daily_breakdown || data.daily_breakdown.length === 0) {
      return data.metrics?.baseline_units || 0;
    }
    const totalUnits = data.daily_breakdown.reduce((sum, day) => sum + day.units, 0);
    return totalUnits / data.daily_breakdown.length;
  };

  const patterns = calculatePatterns();
  const baseline = calculateBaseline();

  const getPatternInsight = (variance: number) => {
    if (variance > 50) {
      return {
        icon: <TrendingUp color="success" />,
        text: 'Busier than average',
        variance: `+${variance.toFixed(0)}%`
      };
    }
    if (variance < -50) {
      return {
        icon: <TrendingDown color="error" />,
        text: 'Slower than average',
        variance: `${variance.toFixed(0)}%`
      };
    }
    return {
      icon: <TrendingFlat color="action" />,
      text: 'Average',
      variance: `${variance.toFixed(0)}%`
    };
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h3" component="span">
          Weekly Sales Pattern
        </Typography>
        <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
          (Based on {data.daily_breakdown?.length || 0} days shown)
        </Typography>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Day</TableCell>
              <TableCell>Avg Sales</TableCell>
              <TableCell>vs Average</TableCell>
              <TableCell>Pattern</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {patterns.map((pattern) => {
              const variance = ((pattern.median_units - baseline) / baseline) * 100;
              const patternInsight = getPatternInsight(variance);

              return (
                <TableRow key={pattern.day} hover>
                  <TableCell>{pattern.day}</TableCell>
                  <TableCell>
                    <strong>{Math.round(pattern.median_units)} sold</strong>
                  </TableCell>
                  <TableCell>{patternInsight.variance}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {patternInsight.icon}
                      <Typography variant="body2">{patternInsight.text}</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="body2" color="text.secondary" mt={2}>
        Average daily sales: {Math.round(baseline)} items
      </Typography>
    </Box>
  );
}
