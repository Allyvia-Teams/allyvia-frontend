import { useEffect, useState } from 'react';
import { Box, Card, CardContent, CardHeader, Chip, Stack, Typography, Button, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Clock, LogIn, LogOut, AlertCircle, Loader2, RefreshCcw } from 'lucide-react';
import { clockIn, clockOut, getMyTimeEntries, TimeEntry } from 'api/employee.api';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const formatElapsed = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

export default function ClockInOutCard() {
  const theme = useTheme();
  const [openEntry, setOpenEntry] = useState<TimeEntry | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const status: 'in' | 'out' = openEntry?.clock_out ? 'out' : openEntry ? 'in' : 'out';

  const refresh = async () => {
    try {
      setLoading(true);
      setErr(null);
      const { data } = await getMyTimeEntries({ open: true });
      setOpenEntry(data?.[0] ?? null);
    } catch (e: any) {
      setErr(e?.message || 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (openEntry && !openEntry.clock_out && openEntry.clock_in) {
      const start = new Date(openEntry.clock_in).getTime();
      const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    } else {
      setElapsed(0);
    }
  }, [openEntry]);

  const doClockIn = async () => {
    try {
      setLoading(true);
      setErr(null);
      const { data } = await clockIn();
      setOpenEntry(data);
    } catch (e: any) {
      setErr(e?.message || 'Clock-in failed');
    } finally {
      setLoading(false);
    }
  };

  const doClockOut = async () => {
    try {
      setLoading(true);
      setErr(null);
      const { data } = await clockOut(note || undefined);
      setOpenEntry(data);
      setNote('');
    } catch (e: any) {
      setErr(e?.message || 'Clock-out failed');
    } finally {
      setLoading(false);
      refresh();
    }
  };

  const lastIn = openEntry?.clock_in || null;
  const lastOut = openEntry?.clock_out || null;

  return (
    <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'inline-flex' }}>
              <Clock size={18} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Clock In / Out
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {status === 'in' ? 'You are clocked in' : 'You are clocked out'}
              </Typography>
            </Box>
            <Chip
              label={status === 'in' ? 'Clocked in' : 'Clocked out'}
              color={status === 'in' ? 'success' : 'default'}
              size="small"
              sx={{ ml: 'auto' }}
            />
          </Stack>
        }
      />
      <CardContent>
        {/* Timer */}
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

        {/* Actions */}
        <Stack direction="row" gap={1} flexWrap="wrap">
          {status === 'out' ? (
            <Button onClick={doClockIn} disabled={loading} variant="contained" startIcon={<LogIn size={16} />} sx={{ borderRadius: 2 }}>
              {loading ? <Loader2 size={16} /> : 'Clock In'}
            </Button>
          ) : (
            <>
              <TextField
                label="Note (optional)"
                size="small"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                sx={{ minWidth: 220 }}
              />
              <Button onClick={doClockOut} disabled={loading} variant="outlined" startIcon={<LogOut size={16} />} sx={{ borderRadius: 2 }}>
                {loading ? <Loader2 size={16} /> : 'Clock Out'}
              </Button>
            </>
          )}
          <Button onClick={refresh} disabled={loading} variant="outlined" startIcon={<RefreshCcw size={16} />} sx={{ borderRadius: 2 }}>
            Refresh
          </Button>
        </Stack>

        {err && (
          <Stack direction="row" alignItems="center" gap={1.25} sx={{ mt: 2, color: 'error.main' }}>
            <AlertCircle size={16} /> <Typography variant="body2">{err}</Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
