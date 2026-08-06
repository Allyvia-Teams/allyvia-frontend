// views/inventory/InsightsChrome.tsx
//
// The furniture every inventory insights panel shares: the window caption, the
// caveat block, a sign-aware figure, and the margin KPI strip.
//
// THE WINDOW CAPTION IS NOT DECORATION. Every figure on these screens is true
// only of its window and its scope, and a panel that is screenshotted, exported
// or pasted into a message loses the picker that produced it. So the window
// travels WITH the numbers, and it is read back from the RESPONSE envelope
// rather than from the picker's state — if the server fell back to its own
// default window, the caption says what was actually measured.

import { ReactNode } from 'react';

import { Box, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { IconInfoCircle } from '@tabler/icons-react';

import AllyviaChip from 'ui-component/common/AllyviaChip';
import AllyviaStats from 'ui-component/common/AllyviaStats';

import {
  AnalyticsEnvelope,
  FigureTone,
  GmroiBlock,
  NET_RETURNS_NOTE,
  describeGmroi,
  describeScope,
  describeWindow,
  describeWindowRange,
  sellThroughGauge
} from './insights';

/** What the shell hands every panel. Each panel fetches its own data. */
export interface InsightsViewProps {
  /** "YYYY-MM-DD", already validated by the shell's picker. */
  start: string;
  end: string;
  /** A uuid or null. The query builders drop anything else rather than 500. */
  locationId: string | null;
  /** Bumped by the shell's refresh control; a panel refetches when it changes. */
  refreshKey: number;
}

/**
 * AllyviaStats' status colour for a figure.
 *
 * Only NEGATIVE gets a colour. `signTone` calls every value above zero
 * 'positive', and painting each of those green would say "good" about a 4%
 * sell-through — a verdict nobody has set a threshold for. A loss, on the other
 * hand, is a fact about the sign and is worth shouting.
 */
export const statsThemeForTone = (tone: FigureTone): 'default' | 'alert' => (tone === 'negative' ? 'alert' : 'default');

/** The MUI colour for the same tone, for text inside a table cell. */
export const textColorForTone = (tone: FigureTone): string =>
  tone === 'negative' ? 'error.main' : tone === 'unknown' ? 'text.secondary' : 'text.primary';

export interface ToneValueProps {
  tone: FigureTone;
  children: ReactNode;
  /** Why it reads the way it does — shown on hover, e.g. the net-returns note. */
  note?: string | null;
}

/** A figure coloured by the SIGN of the number behind it, never by a verdict. */
export function ToneValue({ tone, children, note }: ToneValueProps) {
  const body = (
    <Typography component="span" variant="body2" sx={{ color: textColorForTone(tone), fontWeight: tone === 'negative' ? 600 : 400 }}>
      {children}
    </Typography>
  );
  return note ? (
    <Tooltip title={note}>
      <span>{body}</span>
    </Tooltip>
  ) : (
    body
  );
}

export interface SellThroughCellProps {
  fraction: number | null;
  /** True when returns outran sales, so the reader gets the reason not a verdict. */
  netReturns?: boolean;
}

/**
 * Sell-through as a bar AND the true figure, never one without the other.
 *
 * `sellThroughGauge` clamps the drawable fraction into [0, 1] and reports
 * whether it had to. A bar cannot draw -200% or 340%, but a silent clamp is how
 * a refund artefact ends up looking like a sold-out style and a runaway
 * best-seller looks merely full — so the honest number is printed beside a bar
 * that is visibly pinned, and the clamp is admitted in words.
 */
export function SellThroughCell({ fraction, netReturns = false }: SellThroughCellProps) {
  const gauge = sellThroughGauge(fraction);
  const note = netReturns
    ? NET_RETURNS_NOTE
    : gauge.outOfRange
      ? 'The bar is pinned at the end of its scale. The figure beside it is the real one.'
      : null;
  return (
    <Stack spacing={0.5} sx={{ minWidth: 110 }}>
      <Stack direction="row" spacing={0.75} alignItems="baseline">
        <ToneValue tone={gauge.tone} note={note}>
          {gauge.display}
        </ToneValue>
        {gauge.outOfRange && (
          <Typography variant="caption" color="text.secondary">
            off scale
          </Typography>
        )}
      </Stack>
      <LinearProgress
        variant="determinate"
        value={gauge.fraction * 100}
        color={gauge.tone === 'negative' ? 'error' : 'primary'}
        sx={{ height: 6, borderRadius: 1, opacity: gauge.tone === 'unknown' ? 0.3 : 1 }}
      />
    </Stack>
  );
}

export interface WindowCaptionProps {
  envelope: Pick<AnalyticsEnvelope, 'window' | 'location_name'> | null;
  /**
   * True for the aging panel, whose figures are measured as of today over all
   * history: `start`/`end` are accepted, echoed and ignored, so captioning it
   * with the window would attach a range to numbers the range never touched.
   */
  ignoresWindow?: boolean;
  /** Overrides the scope chip where the endpoint does not honour the filter. */
  scopeLabel?: string;
}

/** "30 days to 5 Aug 2026 · 7 Jul – 5 Aug · Downtown", as chips. */
export function WindowCaption({ envelope, ignoresWindow = false, scopeLabel }: WindowCaptionProps) {
  if (!envelope) return null;
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
      {ignoresWindow ? (
        <AllyviaChip
          size="small"
          variant="outlined"
          label="As of today"
          tooltipTitle="Measured now over all history. The date window does not change these figures."
        />
      ) : (
        <>
          <AllyviaChip
            size="small"
            variant="outlined"
            label={describeWindow(envelope.window)}
            tooltipTitle="The window these figures were computed over, read back from the response — not from the picker."
          />
          <AllyviaChip size="small" variant="outlined" label={describeWindowRange(envelope.window)} />
        </>
      )}
      <AllyviaChip size="small" variant="outlined" label={scopeLabel ?? describeScope(envelope)} />
    </Stack>
  );
}

export interface CaveatsProps {
  notes: Array<string | null | undefined>;
}

/** The sentences that stop a reconciliation nobody can win. */
export function Caveats({ notes }: CaveatsProps) {
  const present = notes.filter((note): note is string => typeof note === 'string' && note.trim().length > 0);
  if (present.length === 0) return null;
  return (
    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.default' }}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <IconInfoCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
        <Stack spacing={0.75}>
          {present.map((note) => (
            <Typography key={note} variant="caption" color="text.secondary">
              {note}
            </Typography>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

export interface GmroiStripProps {
  block: GmroiBlock | null;
  loading?: boolean;
  /** Named so nobody mistakes a per-location block for the company's. */
  scopeNote?: string;
}

/**
 * Revenue, COGS, margin, margin %, GMROI and stock turn.
 *
 * Every figure comes through `describeGmroi`, which keeps the sign: a markdown
 * sold below today's moving-average cost genuinely produces a negative margin
 * (probe: revenue $10, COGS $50, margin -$40, -400%, GMROI -0.40x), and an
 * unsigned currency formatter would show that loss as a $40 profit.
 *
 * MIND THE MIXED CONVENTION behind these tiles: `gross_margin_pct` arrives
 * already multiplied by 100 while `gmroi` and `stock_turn` are fractions, and
 * all three sit in the same object. They are formatted by different functions
 * for exactly that reason.
 */
export function GmroiStrip({ block, loading = false, scopeNote }: GmroiStripProps) {
  const display = describeGmroi(block);
  const tiles: Array<{ title: string; value: string; theme: 'default' | 'alert'; help: string }> = [
    { title: 'Revenue', value: display.revenue, theme: 'default', help: 'Sales of these items in this window, from POS sale lines.' },
    {
      title: 'Cost of goods',
      value: display.cogs,
      theme: 'default',
      help: 'Units sold x the CURRENT moving-average cost — not the cost at the time of sale. It reconciles with the finance dashboard rather than with the COGS journal.'
    },
    {
      title: 'Gross margin',
      value: display.grossMargin,
      theme: statsThemeForTone(display.marginTone),
      help: 'Revenue minus cost of goods. Negative when items sold below what stock now costs to replace.'
    },
    {
      title: 'Margin %',
      value: display.grossMarginPct,
      theme: statsThemeForTone(display.marginTone),
      help: 'Gross margin as a percentage of revenue. Undefined, and shown as a dash, when there was no revenue.'
    },
    {
      title: 'GMROI',
      value: display.gmroi,
      theme: statsThemeForTone(display.gmroiTone),
      help: `Gross margin for every unit of cost carried — gross margin ÷ average inventory at cost (${display.averageInventoryCost}). Below 1.00x the stock is not paying for the space it takes.`
    },
    {
      title: 'Stock turn',
      value: display.stockTurn,
      theme: 'default',
      help: `How many times the average holding sold through in this window — cost of goods ÷ average inventory at cost (${display.averageInventoryCost}).`
    }
  ];

  return (
    <Stack spacing={1}>
      <Grid container spacing={2}>
        {tiles.map((tile) => (
          <Grid key={tile.title} size={{ xs: 6, sm: 4, md: 2 }}>
            <AllyviaStats
              title={tile.title}
              value={tile.value}
              theme={tile.theme}
              size="small"
              loading={loading}
              chip={
                <Tooltip title={tile.help}>
                  <Box component="span" sx={{ display: 'inline-flex', color: 'text.secondary' }}>
                    <IconInfoCircle size={13} />
                  </Box>
                </Tooltip>
              }
            />
          </Grid>
        ))}
      </Grid>
      {scopeNote && (
        <Typography variant="caption" color="text.secondary">
          {scopeNote}
        </Typography>
      )}
    </Stack>
  );
}
