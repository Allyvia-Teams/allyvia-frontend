import React from 'react';
import { ToggleButtonGroup, ToggleButton, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface AllyviaViewToggleOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface AllyviaViewToggleProps {
  value: string;
  onChange: (value: string) => void;
  options: AllyviaViewToggleOption[];
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

const AllyviaViewToggle: React.FC<AllyviaViewToggleProps> = ({ value, onChange, options, size = 'small', fullWidth = false }) => {
  const theme = useTheme();

  const handleChange = (_event: React.MouseEvent<HTMLElement>, newValue: string | null) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={handleChange}
      size={size}
      sx={{
        width: fullWidth ? '100%' : 'auto',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        '& .MuiToggleButtonGroup-grouped': {
          border: '1px solid',
          borderColor: theme.palette.divider,
          borderRadius: '8px !important',
          textTransform: 'none',
          px: 2,
          py: 1,
          mx: 0,
          '&.Mui-selected': {
            bgcolor: theme.palette.primary.main,
            color: '#ffffff',
            borderColor: theme.palette.primary.main,
            '& svg': {
              color: '#ffffff'
            },
            '&:hover': {
              bgcolor: theme.palette.primary.dark,
              borderColor: theme.palette.primary.dark,
              color: '#ffffff',
              '& svg': {
                color: '#ffffff'
              }
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {option.icon}
            {option.label}
          </Box>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};

export default AllyviaViewToggle;
