// material-ui
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

// project imports
import { PanelMessage } from 'ui-component/frame';
import { formatMoney, type RankedRow } from '../analyticsPage';

interface RankedListProps {
  rows: RankedRow[];
  loading?: boolean;
  error?: boolean;
  empty: string;
  /** Bar colour: the series colour this list belongs to. */
  color: string;
  currency?: string;
}

/** Label · bar · amount, largest first. Category and amount first, no maths on the page. */
export default function RankedList({ rows, loading, error, empty, color, currency = 'USD' }: RankedListProps) {
  if (loading) {
    return (
      <Box sx={{ px: '14px', py: 1 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={36} />
        ))}
      </Box>
    );
  }
  if (error) return <PanelMessage>Couldn't load this. Try another period or refresh the page.</PanelMessage>;
  if (!rows.length) return <PanelMessage>{empty}</PanelMessage>;
  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, px: '14px', py: '4px' }}>
      {rows.map((r) => (
        <Box
          component="li"
          key={r.label}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr) 96px',
            alignItems: 'center',
            gap: 1.5,
            py: '9px',
            borderBottom: '1px solid',
            borderColor: 'grey.100',
            '&:last-of-type': { borderBottom: 0 }
          }}
        >
          <Typography sx={{ fontSize: '0.875rem', color: 'text.dark', minWidth: 0 }} noWrap title={r.label}>
            {r.label}
            {r.detail ? (
              <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                {' '}
                · {r.detail}
              </Box>
            ) : null}
          </Typography>
          <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.100' }} aria-hidden="true">
            <Box sx={{ height: 8, borderRadius: 4, bgcolor: color, width: `${r.share}%` }} />
          </Box>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {formatMoney(r.amount, currency)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
