import React, { useMemo } from 'react';
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  Chip,
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Stack
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CRMAnalyticsParams } from 'types/analytics';
import { buildCRMFilterOptions, CRMFilterOptionsInput } from './crmAnalyticsFilterOptions';

interface CRMAnalyticsFiltersProps {
  filters: CRMAnalyticsParams;
  onFiltersChange: (filters: Partial<CRMAnalyticsParams>) => void;
  crmData?: CRMFilterOptionsInput;
}

const CRMAnalyticsFilters: React.FC<CRMAnalyticsFiltersProps> = ({ filters, onFiltersChange, crmData }) => {
  const { companies, owners, stages, priorities, sources } = useMemo(() => buildCRMFilterOptions(crmData), [crmData]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Grid container spacing={3}>
        {/* Date Range & Type */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Date Range & Type
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DatePicker
                  label="Start Date"
                  value={filters.start_date ? new Date(filters.start_date) : null}
                  onChange={(date) => {
                    onFiltersChange({
                      start_date: date ? date.toISOString().split('T')[0] : undefined
                    });
                  }}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <DatePicker
                  label="End Date"
                  value={filters.end_date ? new Date(filters.end_date) : null}
                  onChange={(date) => {
                    onFiltersChange({
                      end_date: date ? date.toISOString().split('T')[0] : undefined
                    });
                  }}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Date Type</InputLabel>
                  <Select
                    value={filters.date_type || 'created'}
                    onChange={(e) => onFiltersChange({ date_type: e.target.value as 'created' | 'updated' | 'closed' })}
                    label="Date Type"
                  >
                    <MenuItem value="created">Created Date</MenuItem>
                    <MenuItem value="updated">Updated Date</MenuItem>
                    <MenuItem value="closed">Closed Date</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* Basic Filters */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Basic Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Company</InputLabel>
                  <Select
                    value={filters.company_id || ''}
                    onChange={(e) => onFiltersChange({ company_id: e.target.value || undefined })}
                    label="Company"
                  >
                    <MenuItem value="">All Companies</MenuItem>
                    {companies.map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Autocomplete
                  multiple
                  size="small"
                  options={owners}
                  getOptionLabel={(option) => option.name}
                  value={owners.filter((owner) => filters.owner_ids?.includes(owner.id))}
                  onChange={(_, value) => {
                    onFiltersChange({
                      owner_ids: value.map((owner) => owner.id)
                    });
                  }}
                  noOptionsText="No owners in loaded CRM data"
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index });
                      return <Chip key={key || option.id} variant="outlined" label={option.name} {...tagProps} />;
                    })
                  }
                  renderInput={(params) => <TextField {...params} label="Owners/Assignees" placeholder="Select owners..." />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Autocomplete
                  multiple
                  size="small"
                  options={stages}
                  getOptionLabel={(option) => option.name}
                  value={stages.filter((stage) => filters.stage_ids?.includes(stage.id))}
                  onChange={(_, value) => {
                    onFiltersChange({
                      stage_ids: value.map((stage) => stage.id)
                    });
                  }}
                  noOptionsText="No stages in loaded CRM data"
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index });
                      return <Chip key={key || option.id} variant="outlined" label={option.name} {...tagProps} />;
                    })
                  }
                  renderInput={(params) => <TextField {...params} label="Pipeline Stages" placeholder="Select stages..." />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Autocomplete
                  multiple
                  size="small"
                  options={priorities}
                  getOptionLabel={(option) => option.name}
                  value={priorities.filter((priority) => filters.priority_ids?.includes(priority.id))}
                  onChange={(_, value) => {
                    onFiltersChange({
                      priority_ids: value.map((priority) => priority.id)
                    });
                  }}
                  noOptionsText="Priority filter unavailable"
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index });
                      return <Chip key={key || option.id} variant="outlined" label={option.name} {...tagProps} />;
                    })
                  }
                  renderInput={(params) => <TextField {...params} label="Priority" placeholder="Select priorities..." />}
                />
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* Advanced Filters */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Advanced Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Autocomplete
                  multiple
                  size="small"
                  options={sources}
                  getOptionLabel={(option) => option.name}
                  value={sources.filter((source) => filters.source_ids?.includes(source.id))}
                  onChange={(_, value) => {
                    onFiltersChange({
                      source_ids: value.map((source) => source.id)
                    });
                  }}
                  noOptionsText="No sources in loaded CRM data"
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index });
                      return <Chip key={key || option.id} variant="outlined" label={option.name} {...tagProps} />;
                    })
                  }
                  renderInput={(params) => <TextField {...params} label="Lead Sources" placeholder="Select sources..." />}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Min Value"
                  type="number"
                  value={filters.min_value || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      min_value: e.target.value ? parseFloat(e.target.value) : undefined
                    })
                  }
                  placeholder="0"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Max Value"
                  type="number"
                  value={filters.max_value || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      max_value: e.target.value ? parseFloat(e.target.value) : undefined
                    })
                  }
                  placeholder="1000000"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Min Probability"
                    type="number"
                    value={filters.min_probability || ''}
                    onChange={(e) =>
                      onFiltersChange({
                        min_probability: e.target.value ? parseFloat(e.target.value) : undefined
                      })
                    }
                    placeholder="0"
                    inputProps={{ min: 0, max: 100 }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Max Probability"
                    type="number"
                    value={filters.max_probability || ''}
                    onChange={(e) =>
                      onFiltersChange({
                        max_probability: e.target.value ? parseFloat(e.target.value) : undefined
                      })
                    }
                    placeholder="100"
                    inputProps={{ min: 0, max: 100 }}
                  />
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* Group By */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Group By
            </Typography>
            <ToggleButtonGroup
              value={filters.group_by || 'week'}
              exclusive
              onChange={(_, value) => {
                if (value) onFiltersChange({ group_by: value });
              }}
              size="small"
            >
              <ToggleButton value="day">Day</ToggleButton>
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Grid>
      </Grid>
    </LocalizationProvider>
  );
};

export default CRMAnalyticsFilters;
