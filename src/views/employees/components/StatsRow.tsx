import { Box } from '@mui/material';
import AllyviaStats from 'ui-component/common/AllyviaStats';

interface StatsRowProps {
  totalDuration: string;
  recordsCount: number;
  lastActivity: string;
}

export default function StatsRow({ totalDuration, recordsCount, lastActivity }: StatsRowProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 2
      }}
    >
      <AllyviaStats title="Total Duration" value={totalDuration} theme="default" size="medium" />
      <AllyviaStats title="Records" value={recordsCount} theme="success" size="medium" />
      <AllyviaStats title="Last Activity" value={lastActivity} theme="warning" size="medium" />
    </Box>
  );
}
