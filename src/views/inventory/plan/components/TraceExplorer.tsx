// "See the numbers" (design §10): the decision trace behind a card's number, opened level by level. Loaded
// lazily (ApexCharts reads `window` on import). One GET returns every node; opening is local state.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Chart from 'react-apexcharts';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';

import { getTrace } from 'api/agentTrace.api';

import { flatten, pathTo, seriesOf } from '../traceTree';

interface Props {
  traceId: string;
  locationId: string | null;
  /** Open at this node (a citation to a deeper node of the card). */
  openKey?: string | null;
}

const detail = (error: unknown): string => {
  const d = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof d === 'string' ? d : 'The numbers could not be read. Try again.';
};

export default function TraceExplorer({ traceId, locationId, openKey }: Props) {
  const query = useQuery({
    queryKey: ['buy-trace', traceId, locationId],
    queryFn: () => getTrace(traceId, locationId),
    staleTime: Infinity,
    retry: false
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const trace = query.data?.trace ?? null;

  // Opening at a key expands the way to it, once per key.
  if (trace && openKey && openKey !== openedFor) {
    const path = pathTo(trace, openKey);
    setOpenedFor(openKey);
    if (path) setExpanded((current) => new Set([...current, ...path]));
  }

  const rows = useMemo(() => (trace ? flatten(trace, expanded) : []), [trace, expanded]);

  if (query.isLoading) return <Skeleton variant="rounded" height={120} sx={{ mt: 1.5 }} />;
  if (query.isError || !trace) {
    return (
      <Typography variant="body2" color="error" sx={{ mt: 1.5 }} role="alert">
        {detail(query.error)}
      </Typography>
    );
  }

  return (
    <Box
      component="ul"
      aria-label="The numbers behind this card"
      sx={{ mt: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden' }}
    >
      {rows.map((row) => {
        const series = seriesOf(row.node);
        const target = row.key === openKey;
        return (
          <Box
            key={row.key}
            component="li"
            sx={(theme) => ({
              pl: `${12 + row.depth * 18}px`,
              pr: '12px',
              py: '8px',
              borderTop: '1px solid',
              borderColor: 'divider',
              '&:first-of-type': { borderTop: 0 },
              bgcolor: target ? alpha(theme.palette.warning.main, 0.12) : undefined
            })}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ width: 24, flexShrink: 0 }}>
                {row.hasChildren && row.depth > 0 ? (
                  <IconButton
                    size="small"
                    aria-label={row.open ? `Close ${row.label}` : `Open ${row.label}`}
                    aria-expanded={row.open}
                    onClick={() =>
                      setExpanded((current) => {
                        const next = new Set(current);
                        if (next.has(row.key)) next.delete(row.key);
                        else next.add(row.key);
                        return next;
                      })
                    }
                    sx={{ p: '2px' }}
                  >
                    {row.open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                  </IconButton>
                ) : null}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: row.depth === 0 ? 600 : 500 }}>{row.label}</Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                  {row.key}
                </Typography>
                {row.node.formula?.text ? (
                  <Typography variant="caption" color="text.secondary" component="div">
                    {row.node.formula.text}
                  </Typography>
                ) : null}
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{row.valueText}</Typography>
                {row.statusText ? (
                  <Typography variant="caption" color="text.secondary">
                    {row.statusText}
                    {row.node.evidence?.n !== null && row.node.evidence?.n !== undefined ? ` · n=${row.node.evidence.n}` : ''}
                  </Typography>
                ) : null}
              </Box>
            </Box>
            {series ? (
              <Box sx={{ pl: '32px', mt: 0.5 }} aria-label={`${row.label}: ${series.length} points`}>
                <Chart
                  type="line"
                  height={90}
                  series={[{ name: row.label, data: series.map((p) => ({ x: p.x, y: p.y })) }]}
                  options={{
                    chart: { sparkline: { enabled: true }, animations: { enabled: false } },
                    stroke: { width: 2, curve: 'straight' },
                    tooltip: { enabled: true }
                  }}
                />
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
