import { Box, TextField } from '@mui/material';
import AllyviaFilterButton from 'ui-component/common/AllyviaFilterButton';
import RefreshButton from 'ui-component/common/RefreshButton';

interface ControlsBarProps {
  days: number;
  daysError: string | null;
  isError: boolean;
  loading: boolean;
  onDaysChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerate: () => void;
  onForceRefresh: () => void;
}

export default function ControlsBar({ days, daysError, isError, loading, onDaysChange, onGenerate, onForceRefresh }: ControlsBarProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3, flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <TextField
          label="Forecast Days"
          type="number"
          value={days}
          onChange={onDaysChange}
          error={isError}
          helperText={daysError || '1-14 days'}
          size="small"
          sx={{ width: 200 }}
          inputProps={{ min: 1, max: 14 }}
          disabled={loading}
        />
        <AllyviaFilterButton
          height={40}
          variant="contained"
          onClick={onGenerate}
          disabled={loading || isError}
          label={loading ? 'Generating...' : 'Generate'}
        />
      </Box>
      <RefreshButton onClick={onForceRefresh} disabled={loading || isError} title="Force refresh (bypass cache)" size="small" />
    </Box>
  );
}
