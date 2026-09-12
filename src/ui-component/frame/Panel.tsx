import type { ReactNode } from 'react';

// material-ui
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

// project imports
import { useToneColor } from './KpiTile';
import type { Tone } from './frame';

// ==============================|| FRAME - PANEL ||============================== //
// Design handoff 1.3. Hairline border, 10px radius, overflow hidden, no shadow.
// Header 11px 14px: 17px icon in text.secondary, title 14/600, right-aligned
// note 11.5 in text.disabled, 1px grey.100 divider.

export interface PanelProps {
  title: ReactNode;
  icon?: ReactNode;
  /** One clause: "Updated overnight", "As of now", the window label. */
  note?: ReactNode;
  /** Extra header controls, after the note. */
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}

export default function Panel({ title, icon, note, action, children, id }: PanelProps) {
  return (
    <Box
      component="section"
      id={id}
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        overflow: 'hidden',
        minWidth: 0
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: '14px',
          py: '11px',
          borderBottom: '1px solid',
          borderColor: 'grey.100',
          color: 'text.secondary'
        }}
      >
        {icon ? (
          <Box component="span" sx={{ display: 'flex', flexShrink: 0 }}>
            {icon}
          </Box>
        ) : null}
        <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.dark', minWidth: 0 }}>
          {title}
        </Typography>
        {note ? (
          <Typography component="span" sx={{ ml: 'auto', fontSize: '0.8125rem', color: 'text.disabled', whiteSpace: 'nowrap' }}>
            {note}
          </Typography>
        ) : null}
        {action ? <Box sx={{ ml: note ? 1 : 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>{action}</Box> : null}
      </Box>
      {children}
    </Box>
  );
}

// ------------------------------ Stats strip ------------------------------ //
// Design handoff 1.3 "Stats strip": auto-fit 150px cells, 12px 14px, label 10.5
// uppercase, value 19/700, basis 11.5.

export interface StatCell {
  label: ReactNode;
  value: ReactNode;
  basis?: ReactNode;
  basisTooltip?: string;
  tone?: Tone;
}

const StatCellView = ({ label, value, basis, basisTooltip, tone = 'default' }: StatCell) => {
  const color = useToneColor(tone);
  const basisNode = basis ? (
    <Typography component="div" sx={{ mt: '2px', fontSize: '0.8125rem', color: 'text.disabled', lineHeight: 1.4 }}>
      {basis}
    </Typography>
  ) : null;
  return (
    <Box sx={{ px: '14px', py: '12px', borderLeft: '1px solid', borderColor: 'grey.100', minWidth: 0 }}>
      <Typography
        component="div"
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'grey.600',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {label}
      </Typography>
      <Typography
        component="div"
        sx={{ mt: '4px', fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color }}
      >
        {value}
      </Typography>
      {basisTooltip && basisNode ? (
        <Tooltip title={basisTooltip} placement="top" arrow>
          <Box component="span" sx={{ display: 'inline-block', cursor: 'help' }}>
            {basisNode}
          </Box>
        </Tooltip>
      ) : (
        basisNode
      )}
    </Box>
  );
};

export function StatsStrip({ stats, minWidth = 150 }: { stats: StatCell[]; minWidth?: number }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`, ml: '-1px' }}>
      {stats.map((stat, index) => (
        <StatCellView key={index} {...stat} />
      ))}
    </Box>
  );
}

// ------------------------------- List row -------------------------------- //
// Design handoff 1.3 "List": 12px 14px rows, a 26px icon well in primary at 10%,
// title 13.5/600, body 12.5, right column impact 13.5/700 with a basis under it.

export interface ListRowProps {
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  /** Right column headline, e.g. "+$1,180". */
  aside?: ReactNode;
  asideBasis?: ReactNode;
  asideTone?: Tone;
  /** Anything after the aside: feedback controls, links. */
  trailing?: ReactNode;
  /** Below the row: reason chips, expanded detail. */
  footer?: ReactNode;
  dimmed?: boolean;
}

export function ListRow({ icon, title, body, aside, asideBasis, asideTone = 'success', trailing, footer, dimmed }: ListRowProps) {
  const theme = useTheme();
  const asideColor = useToneColor(asideTone);
  return (
    <Box
      sx={{
        px: '14px',
        py: '12px',
        borderTop: '1px solid',
        borderColor: 'grey.100',
        '&:first-of-type': { borderTop: 0 },
        opacity: dimmed ? 0.55 : 1,
        transition: 'opacity .2s'
      }}
    >
      <Box sx={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {icon ? (
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '8px',
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              mt: '1px'
            }}
          >
            {icon}
          </Box>
        ) : null}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography component="div" sx={{ fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.35, color: 'text.dark' }}>
            {title}
          </Typography>
          {body ? (
            <Typography
              component="div"
              sx={{ mt: '2px', fontSize: '0.875rem', lineHeight: 1.45, color: 'text.primary', textWrap: 'pretty' }}
            >
              {body}
            </Typography>
          ) : null}
        </Box>
        {aside ? (
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography component="div" sx={{ fontSize: '0.9375rem', fontWeight: 700, color: asideColor, whiteSpace: 'nowrap' }}>
              {aside}
            </Typography>
            {asideBasis ? (
              <Typography component="div" sx={{ fontSize: '0.75rem', color: 'text.disabled', letterSpacing: '0.02em' }}>
                {asideBasis}
              </Typography>
            ) : null}
          </Box>
        ) : null}
        {trailing ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>{trailing}</Box> : null}
      </Box>
      {footer ? <Box sx={{ mt: 1, pl: icon ? '38px' : 0 }}>{footer}</Box> : null}
    </Box>
  );
}

/** Body text for a panel's empty, error or loading state. */
export function PanelMessage({ children, tone = 'default' }: { children: ReactNode; tone?: Tone }) {
  const color = useToneColor(tone);
  return (
    <Box sx={{ px: '14px', py: '14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
      <Typography component="div" sx={{ fontSize: '0.875rem', color: tone === 'default' ? 'text.secondary' : color, lineHeight: 1.45 }}>
        {children}
      </Typography>
    </Box>
  );
}
