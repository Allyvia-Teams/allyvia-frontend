import type { ReactNode } from 'react';

// material-ui
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// project imports
import { useToneColor } from './KpiTile';
import type { Tone } from './frame';

// ==============================|| FRAME - RAIL CARD ||============================== //
// Design handoff 1.4. Same border and radius as a panel. Header 10px 14px, 15px
// icon, title 13/600. Rows 9px 14px: label 12.5 left, value 12.5/700 right.
// Optional footnote 11.5 in text.disabled.

export interface RailRow {
  label: ReactNode;
  value: ReactNode;
  tone?: Tone;
  /** Renders the row as a link. */
  to?: string;
}

export interface RailCardProps {
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  rows?: RailRow[];
  note?: ReactNode;
  /** Free-form body used instead of, or after, `rows`. */
  children?: ReactNode;
  /** Padding for a free-form body (the savings and feedback cards). */
  padded?: boolean;
}

const RailRowView = ({ label, value, tone = 'default' }: RailRow) => {
  const color = useToneColor(tone);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '9px', px: '14px', py: '9px', borderTop: '1px solid', borderColor: 'grey.100' }}>
      <Typography component="span" sx={{ fontSize: '0.875rem', color: 'text.primary', minWidth: 0 }}>
        {label}
      </Typography>
      <Typography component="span" sx={{ ml: 'auto', fontSize: '0.875rem', fontWeight: 700, color, whiteSpace: 'nowrap' }}>
        {value}
      </Typography>
    </Box>
  );
};

export default function RailCard({ title, icon, action, rows, note, children, padded }: RailCardProps) {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        overflow: 'hidden',
        minWidth: 0
      }}
    >
      {title ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            px: '14px',
            py: '10px',
            color: 'text.secondary',
            ...(rows || !padded ? { borderBottom: '1px solid', borderColor: 'grey.100' } : {})
          }}
        >
          {icon ? (
            <Box component="span" sx={{ display: 'flex', flexShrink: 0 }}>
              {icon}
            </Box>
          ) : null}
          <Typography component="h2" sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.dark', minWidth: 0 }}>
            {title}
          </Typography>
          {action ? <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>{action}</Box> : null}
        </Box>
      ) : null}
      {rows?.map((row, index) => <RailRowView key={index} {...row} />)}
      {children ? <Box sx={padded ? { px: '14px', pb: '12px', pt: title ? 0 : '12px' } : undefined}>{children}</Box> : null}
      {note ? (
        <Box sx={{ px: '14px', py: '9px', borderTop: '1px solid', borderColor: 'grey.100' }}>
          <Typography component="div" sx={{ fontSize: '0.8125rem', color: 'text.disabled', lineHeight: 1.45, textWrap: 'pretty' }}>
            {note}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
