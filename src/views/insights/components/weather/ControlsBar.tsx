import { Box, TextField, Button, IconButton, Tooltip } from '@mui/material';
import { IconRefresh } from '@tabler/icons-react';

interface ControlsBarProps {
  days: number | string; // Accept number or string for better typing UX
  daysError: string;
  loading: boolean;
  onDaysChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerate: () => void;
  onForceRefresh: () => void;
}

export default function ControlsBar({ days, daysError, loading, onDaysChange, onGenerate, onForceRefresh }: ControlsBarProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3, flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        <TextField
          label="Forecast Days"
          type="number"
          value={days}
          onChange={onDaysChange}
          error={!!daysError}
          helperText={daysError || '1-14 days'}
          size="small"
          sx={{ width: 150 }}
          inputProps={{ min: 1, max: 14 }}
          disabled={loading}
        />
        <Button
          variant="contained"
          onClick={onGenerate}
          disabled={loading || !!daysError}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            fontWeight: 500,
            height: '40px',
            marginBottom: '20px', // Move up to align with input field (helper text ~20px)
            '&:hover': { bgcolor: 'primary.dark' },
            '&.Mui-disabled': {
              bgcolor: 'primary.main',
              color: 'white',
              opacity: 0.6
            }
          }}
        >
          {loading ? 'Generating...' : 'Generate'}
        </Button>
      </Box>
      <Tooltip title="Force refresh (bypass cache)" arrow>
        <span>
          <IconButton
            onClick={onForceRefresh}
            disabled={loading}
            sx={{
              bgcolor: 'grey.100',
              height: '40px',
              width: '40px',
              marginBottom: '20px', // Match button alignment
              '&:hover': { bgcolor: 'grey.200' },
              '&.Mui-disabled': {
                bgcolor: 'grey.100',
                opacity: 0.6
              }
            }}
          >
            <IconRefresh size={20} />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
