import React from 'react';
import { Grid, Box } from '@mui/material';
import { AnalyticsParams } from 'types/analytics';
import AllyviaFilterSelect from 'ui-component/common/AllyviaFilterSelect';
import AllyviaFilterButton from 'ui-component/common/AllyviaFilterButton';
import AllyviaFilterDatePicker from 'ui-component/common/AllyviaFilterDatePicker';
import { AllyviaDateRangePicker, RangeValue } from 'ui-component/third-party/DateRangePicker';
import { parseDate } from '@internationalized/date';

interface AnalyticsFiltersProps {
  filters: AnalyticsParams;
  onFiltersChange: (filters: AnalyticsParams) => void;
  loading: boolean;
}

const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({ filters, onFiltersChange, loading }) => {
  const handleDateRangeChange = (rangeValue: RangeValue | null) => {
    if (rangeValue) {
      onFiltersChange({
        ...filters,
        from_date: rangeValue.start.toString(),
        to_date: rangeValue.end.toString()
      });
    } else {
      onFiltersChange({
        ...filters,
        from_date: undefined,
        to_date: undefined
      });
    }
  };

  const handleProviderChange = (event: any) => {
    const provider = event.target.value;
    onFiltersChange({
      ...filters,
      provider: provider === 'all' ? undefined : provider
    });
  };

  const handleQuickFilters = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    onFiltersChange({
      ...filters,
      from_date: startDate.toISOString().split('T')[0],
      to_date: endDate.toISOString().split('T')[0]
    });
  };

  // Convert date strings to RangeValue for the date picker
  const currentRangeValue: RangeValue | null =
    filters.from_date && filters.to_date
      ? {
          start: parseDate(filters.from_date),
          end: parseDate(filters.to_date)
        }
      : null;

  return (
    <Box>
      <Grid container spacing={2} alignItems="center">
        {/* Quick Date Filters */}
        <Grid item>
          <AllyviaFilterButton
            label="Last 7 Days"
            onClick={() => handleQuickFilters(7)}
            disabled={loading}
            variant={!filters.from_date ? 'contained' : 'outlined'}
            height={40}
          />
        </Grid>
        <Grid item>
          <AllyviaFilterButton
            label="Last 30 Days"
            onClick={() => handleQuickFilters(30)}
            disabled={loading}
            variant="outlined"
            height={40}
          />
        </Grid>
        <Grid item>
          <AllyviaFilterButton
            label="Last 90 Days"
            onClick={() => handleQuickFilters(90)}
            disabled={loading}
            variant="outlined"
            height={40}
          />
        </Grid>

        {/* Custom Date Range */}
        <Grid item xs={12} md={6}>
          <AllyviaDateRangePicker value={currentRangeValue} onChange={handleDateRangeChange} label="Date Range" />
        </Grid>

        {/* Provider Filter */}
        <Grid item xs={12} md={3}>
          <AllyviaFilterSelect
            label="Provider"
            value={filters.provider || 'all'}
            onChange={handleProviderChange}
            options={[
              { value: 'all', label: 'All Providers' },
              { value: 'quickbooks', label: 'QuickBooks' },
              { value: 'square', label: 'Square' }
            ]}
            disabled={loading}
            height={40}
            width={180}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsFilters;
