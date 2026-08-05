import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export type DashboardRange = 'today' | '7d' | '30d' | 'mtd';

interface DashboardRangeSelectorProps {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
}

const DashboardRangeSelector: React.FC<DashboardRangeSelectorProps> = ({ value, onChange }) => {
  const theme = useTheme();

  const handleChange = (_event: React.MouseEvent<HTMLElement>, newValue: DashboardRange | null) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  const options: { value: DashboardRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: 'mtd', label: 'MTD' }
  ];

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={handleChange}
      size="small"
      sx={{
        '& .MuiToggleButtonGroup-grouped': {
          border: '1px solid',
          borderColor: theme.palette.divider,
          borderRadius: '8px !important',
          textTransform: 'none',
          px: 2,
          py: 0.75,
          mx: 0,
          fontWeight: 500,
          '&.Mui-selected': {
            bgcolor: theme.palette.primary.main,
            color: '#ffffff',
            borderColor: theme.palette.primary.main,
            '&:hover': {
              bgcolor: theme.palette.primary.dark,
              borderColor: theme.palette.primary.dark
            }
          },
          '&:not(.Mui-selected)': {
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            '&:hover': {
              bgcolor: theme.palette.action.hover
            }
          }
        }
      }}
    >
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};

export default DashboardRangeSelector;
