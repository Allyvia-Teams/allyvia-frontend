import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface ClockTimerProps {
  elapsed: number;
  status: 'in' | 'out';
  lastIn?: string | null;
  lastOut?: string | null;
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const formatElapsed = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

export default function ClockTimer({ elapsed, status, lastIn, lastOut }: ClockTimerProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        background:
          status === 'in'
            ? `linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)`
            : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        borderRadius: 2,
        color: 'white',
        p: 2,
        textAlign: 'center',
        mb: 2
      }}
    >
      <Typography variant="h6" fontWeight={900} sx={{ color: 'white', mb: 1, fontSize: '3rem' }}>
        {status === 'in' ? formatElapsed(elapsed) : '00:00:00'}
      </Typography>
      <Typography variant="caption" sx={{ color: 'white', lineHeight: 1.2 }}>
        {status === 'in' ? `Start time: ${fmt(lastIn)}` : 'Start Clock'}
      </Typography>
    </Box>
  );
}
