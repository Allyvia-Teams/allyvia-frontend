import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import { fetchDemandLocality, type LocalityHeadlines } from 'api/innerCircle.api';
const GROUPS = [
  { key: 'local', label: 'Local', color: 'success.main' },
  { key: 'visitor', label: 'Visitor', color: 'info.main' },
  { key: 'unknown', label: 'Unknown', color: 'grey.400' }
] as const;
const percent = (value: number | null | undefined) => (value == null ? 'Not enough data' : `${Math.round(value * 100)}%`);
export default function DemandLocalityPanel({ companyId, headlines }: { companyId: string; headlines?: LocalityHeadlines }) {
  const range = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 27);
    const format = (day: Date) =>
      `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    return { start: format(start), end: format(end) };
  }, []);
  const query = useQuery({ queryKey: ['demand-locality', companyId, range], queryFn: () => fetchDemandLocality(range.start, range.end) });
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, my: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Who is shopping · last four weeks</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
          <Box>
            <Typography variant="h3">{percent(headlines?.visitor_share)}</Typography>
            <Typography variant="body2">Visitor share of sales</Typography>
          </Box>
          <Box>
            <Typography variant="h3">{percent(headlines?.first_time_share)}</Typography>
            <Typography variant="body2">First visits among identified customers</Typography>
          </Box>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          These figures use this store’s sales and current locality labels. Anonymous purchases stay unidentified.
        </Typography>
        {query.isPending ? (
          <Skeleton height={80} />
        ) : query.isError ? (
          <Alert severity="info" action={<Button onClick={() => query.refetch()}>Retry</Button>}>
            The weekly breakdown is unavailable.
          </Alert>
        ) : !query.data.results.length ? (
          <Typography>No sales in this period.</Typography>
        ) : (
          query.data.results.map((row) => {
            const total = row.local.sales + row.visitor.sales + row.unknown.sales;
            const description = GROUPS.map(({ key, label }) => `${label}: ${row[key].sales}`).join(', ');
            return (
              <Box key={row.start}>
                <Typography variant="caption">
                  Week of {row.start} · {description}
                </Typography>
                <Stack
                  direction="row"
                  role="img"
                  aria-label={description}
                  sx={{ height: 12, borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}
                >
                  {GROUPS.map(({ key, color }) => (
                    <Box key={key} sx={{ width: `${total ? (row[key].sales / total) * 100 : 0}%`, bgcolor: color }} />
                  ))}
                </Stack>
              </Box>
            );
          })
        )}
      </Stack>
    </Box>
  );
}
