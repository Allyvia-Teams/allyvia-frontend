import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Stack,
  Typography,
  Button,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tooltip
} from '@mui/material';
import { Users, CalendarDays, Search, Loader2, FileDown, Link as LinkIcon, RefreshCcw } from 'lucide-react';
import { getTimeEntries, TimeEntry } from 'api/employee.api';
import AllyviaStats from 'ui-component/common/AllyviaStats';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const hhmm = (sec?: number | null) => {
  if (typeof sec !== 'number') return '—';
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
};

const dayBoundsToUtc = (startDay: string, endDay: string) => {
  const startUtc = new Date(`${startDay}T00:00:00`);
  const endUtcExcl = new Date(`${endDay}T00:00:00`);
  endUtcExcl.setDate(endUtcExcl.getDate() + 1);
  return { start: startUtc.toISOString(), end: endUtcExcl.toISOString() };
};

export default function AdminTimesheet() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEmployee = searchParams.get('employee_id') || '';
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const [employeeId, setEmployeeId] = useState(initialEmployee);
  const [startDay, setStartDay] = useState(searchParams.get('start') || `${yyyy}-${mm}-${dd}`);
  const [endDay, setEndDay] = useState(searchParams.get('end') || `${yyyy}-${mm}-${dd}`);
  const [rows, setRows] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const totalSec = useMemo(
    () =>
      rows.reduce((acc, r) => {
        const a = r.clock_in ? new Date(r.clock_in).getTime() : 0;
        const b = r.clock_out ? new Date(r.clock_out).getTime() : a;
        return acc + Math.max(0, Math.round((b - a) / 1000));
      }, 0),
    [rows]
  );

  const fetchRows = async () => {
    if (!employeeId) {
      setErr('Enter an Employee UUID');
      return;
    }
    try {
      setLoading(true);
      setErr(null);
      const { start, end } = dayBoundsToUtc(startDay, endDay);
      const { data } = await getTimeEntries({ employee_id: employeeId, start, end });
      setRows(data);
      setSearchParams({ employee_id: employeeId, start: startDay, end: endDay });
    } catch (e: any) {
      setErr(e?.message || 'Failed to load timesheet');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const header = ['Clock In', 'Clock Out', 'Duration (sec)', 'Note'];
    const lines = rows.map((r) => {
      const a = r.clock_in ? new Date(r.clock_in).getTime() : 0;
      const b = r.clock_out ? new Date(r.clock_out).getTime() : a;
      const dur = Math.max(0, Math.round((b - a) / 1000));
      return [fmt(r.clock_in), fmt(r.clock_out), String(dur), r.note ?? ''].map((v) => `"${String(v).replace(/\"/g, '""')}"`).join(',');
    });
    const blob = new Blob([header.join(',') + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet_${employeeId}_${startDay}_${endDay}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyShareLink = async () => {
    const origin = window.location.origin;
    const url = `${origin}/employees/admin-timesheet?employee_id=${encodeURIComponent(employeeId)}&start=${encodeURIComponent(startDay)}&end=${encodeURIComponent(endDay)}`;
    await navigator.clipboard.writeText(url);
  };

  useEffect(() => {
    if (employeeId) fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastIn = rows[rows.length - 1]?.clock_in || null;
  const lastOut = rows[rows.length - 1]?.clock_out || null;

  return (
    <Box>
      {/* Header stats (CSS grid) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 2
        }}
      >
        <AllyviaStats title="Total Duration" value={hhmm(totalSec)} theme="default" size="medium" />
        <AllyviaStats title="Records" value={rows.length} theme="success" size="medium" />
        <AllyviaStats title="Last In · Out" value={`${fmt(lastIn)} · ${fmt(lastOut)}`} theme="warning" size="medium" />
      </Box>

      {/* Filters */}
      <Card sx={{ borderRadius: 3, mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', lg: 'row' }} gap={2} alignItems={{ xs: 'stretch', lg: 'center' }}>
            <Stack direction="row" gap={1.25} alignItems="center" flex={1}>
              <Users size={18} />
              <TextField
                label="Employee ID (UUID)"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>
            <Stack direction="row" gap={1.25} alignItems="center">
              <CalendarDays size={18} />
              <TextField
                label="Start"
                type="date"
                value={startDay}
                onChange={(e) => setStartDay(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ maxWidth: 220 }}
              />
              <TextField
                label="End"
                type="date"
                value={endDay}
                onChange={(e) => setEndDay(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ maxWidth: 220 }}
              />
            </Stack>
            <Stack direction="row" gap={1}>
              <Button
                onClick={fetchRows}
                disabled={loading || !employeeId}
                variant="outlined"
                startIcon={loading ? <Loader2 size={16} /> : <Search size={16} />}
              >
                Fetch
              </Button>
              <Tooltip title={rows.length ? '' : 'No rows to export'}>
                <span>
                  <Button onClick={exportCsv} disabled={!rows.length} variant="outlined" startIcon={<FileDown size={16} />}>
                    CSV
                  </Button>
                </span>
              </Tooltip>
              <Button onClick={copyShareLink} variant="outlined" startIcon={<LinkIcon size={16} />}>
                Share
              </Button>
              <Button onClick={fetchRows} disabled={loading} variant="outlined" startIcon={<RefreshCcw size={16} />}>
                Refresh
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Table */}
      <Card sx={{ borderRadius: 3 }}>
        <CardHeader titleTypographyProps={{ fontWeight: 700 }} title="Timesheet" />
        <CardContent sx={{ pt: 0 }}>
          {err && (
            <Typography color="error" sx={{ mb: 2 }}>
              {err}
            </Typography>
          )}
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Clock In</TableCell>
                <TableCell>Clock Out</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Note</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const a = r.clock_in ? new Date(r.clock_in).getTime() : 0;
                const b = r.clock_out ? new Date(r.clock_out).getTime() : a;
                const dur = Math.max(0, Math.round((b - a) / 1000));
                return (
                  <TableRow key={r.id} hover>
                    <TableCell>{fmt(r.clock_in)}</TableCell>
                    <TableCell>{fmt(r.clock_out)}</TableCell>
                    <TableCell>{hhmm(dur)}</TableCell>
                    <TableCell>{r.note ?? '—'}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={2}>
                  <Typography fontWeight={700}>Total</Typography>
                </TableCell>
                <TableCell>
                  <Typography fontWeight={700}>{hhmm(totalSec)}</Typography>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
