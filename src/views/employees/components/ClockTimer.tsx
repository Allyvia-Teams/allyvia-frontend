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
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        borderRadius: 2,
        color: theme.palette.common.white,
        p: 3,
        textAlign: 'center',
        mb: 2
      }}
    >
      <Typography variant="caption" sx={{ opacity: 0.85 }}>
        Elapsed
      </Typography>
      <Typography variant="h3" fontWeight={900} sx={{ lineHeight: 1, mt: 0.5 }}>
        {status === 'in' ? formatElapsed(elapsed) : '00:00:00'}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
        Last in: <b>{fmt(lastIn)}</b> · Last out: <b>{fmt(lastOut)}</b>
      </Typography>
    </Box>
  );
}
