import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

// project imports
import type { FinanceSales, FinanceSnapshot } from 'api/financeSnapshot';
import { AlertStrip, KpiTile, PageHeader, Panel, PanelMessage, StatsStrip, type StatCell } from 'ui-component/frame';
import MoneyChart from 'views/analytics/sections/MoneyChart';
import FigureTile, { FigureBadge, FigureReason, FigureValue, InnerLink } from './FigureTile';
import { chartAmount } from './snapshotFormat';
import {
  basisLine,
  cashRows,
  channelRows,
  chartPoints,
  detailHref,
  expenseCard,
  extrasRow,
  isConflict,
  lastSyncedText,
  positionRows,
  quickBooksLinks,
  snapshotBlocks,
  sparseDayLabels,
  tiles,
  unreviewedLine,
  type AmountLine,
  type FigureView,
  type Range
} from './snapshotView';

// The snapshot page's sections, driven by props only so they render in a test without a
// network, a store or a router beyond MemoryRouter. FinanceSnapshot.tsx fetches and wires.

export interface Loadable<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const TILE_TITLES = ['Net sales', 'Gross profit', 'Expenses', 'Net profit', 'Cash'];

export function Retry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Box
      role="alert"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        px: '14px',
        py: '12px',
        mb: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        bgcolor: 'background.paper'
      }}
    >
      <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>{message}</Typography>
      <Button size="small" onClick={onRetry}>
        Retry
      </Button>
    </Box>
  );
}

export const cardsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2, mb: 2 } as const;

/** Text-plus-amount rows inside a card. */
export function AmountRows({ rows }: { rows: AmountLine[] }) {
  return (
    <Box component="dl" sx={{ m: 0, px: '14px', py: '4px' }}>
      {rows.map((r) => (
        <Box
          key={r.label}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1.5,
            py: 1,
            borderTop: '1px solid',
            borderColor: 'grey.100',
            '&:first-of-type': { borderTop: 0 }
          }}
        >
          <Typography component="dt" sx={{ fontSize: '0.875rem', color: 'text.secondary', minWidth: 0 }}>
            {r.href ? (
              <Link component={RouterLink} to={r.href} underline="hover" color="inherit" sx={{ fontWeight: 600 }}>
                {r.label}
              </Link>
            ) : (
              r.label
            )}
          </Typography>
          <Typography
            component="dd"
            sx={{ m: 0, fontSize: '0.875rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'text.dark' }}
          >
            {r.amount}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Rows whose amount is a figure: badge beside the label, reason under it when unavailable. */
export function FigureRowList({ rows }: { rows: (FigureView & { note?: string | null })[] }) {
  return (
    <Box component="dl" sx={{ m: 0, px: '14px', py: '4px' }}>
      {rows.map((r) => (
        <Box key={r.label} sx={{ py: 1, borderTop: '1px solid', borderColor: 'grey.100', '&:first-of-type': { borderTop: 0 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1.5 }}>
            <Typography
              component="dt"
              sx={{ fontSize: '0.875rem', color: 'text.secondary', display: 'flex', gap: 1, alignItems: 'center' }}
            >
              {r.label}
              <FigureBadge badge={r.badge} />
            </Typography>
            <Typography
              component="dd"
              sx={{ m: 0, fontSize: '0.875rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'text.dark' }}
            >
              <FigureValue view={r} size="row" />
            </Typography>
          </Box>
          {r.secondary ? (
            <Typography sx={{ mt: '2px', fontSize: '0.8125rem', color: 'text.disabled' }}>
              <FigureReason view={r} />
            </Typography>
          ) : null}
          {r.note ? <Typography sx={{ mt: '2px', fontSize: '0.8125rem', color: 'text.secondary' }}>{r.note}</Typography> : null}
        </Box>
      ))}
    </Box>
  );
}

/** A quiet line under a card's rows (e.g. why money in and out are not shown). */
export function CardNote({ children }: { children: ReactNode }) {
  return <Typography sx={{ px: '14px', pb: '12px', fontSize: '0.8125rem', color: 'text.disabled' }}>{children}</Typography>;
}

/** The unavailable message for a whole card, its reason a link when connecting a bank is the fix. */
export function UnavailableMessage({ reason, fixHref }: { reason: string; fixHref?: string | null }) {
  return (
    <PanelMessage>
      Not available
      <Box component="span" sx={{ display: 'block', color: 'text.disabled', fontSize: '0.8125rem' }}>
        {fixHref ? (
          <Link component={RouterLink} to={fixHref} underline="hover" sx={{ fontWeight: 600 }}>
            {reason}
          </Link>
        ) : (
          reason
        )}
      </Box>
    </PanelMessage>
  );
}

/**
 * The five tiles. Under 600px they go two to a row with Net sales across the top (Net sales;
 * Gross profit and Expenses; Net profit and Cash). Wider, they fill the row as KpiRow does.
 */
export function TileRow({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        mb: 2,
        '@media (max-width:599.95px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', '& > :first-of-type': { gridColumn: '1 / -1' } }
      }}
    >
      {children}
    </Box>
  );
}

export const statCell = (r: FigureView, note?: string | null): StatCell => ({
  label: r.label,
  value: <FigureValue view={r} size="tile" />,
  tag: <FigureBadge badge={r.badge} />,
  basis: r.secondary ? <FigureReason view={r} /> : (note ?? undefined)
});

const viewLink = (to: string) => <InnerLink to={to}>View</InnerLink>;

function CardsSkeleton() {
  return (
    <Box sx={cardsGrid}>
      {['Sales by channel', 'Expenses by category', 'Cash'].map((title) => (
        <Panel key={title} title={title}>
          <Box sx={{ p: '14px' }}>
            <Skeleton height={28} />
            <Skeleton height={28} />
            <Skeleton height={28} width="70%" />
          </Box>
        </Panel>
      ))}
    </Box>
  );
}

function SalesChart({ sales, currency, range }: { sales: Loadable<FinanceSales>; currency: string; range: Range }) {
  const theme = useTheme();
  const narrow = useMediaQuery('(max-width:599.95px)');
  if (sales.isLoading) return <MoneyChart kind="bar" series={[]} loading />;
  if (sales.isError || !sales.data) {
    return (
      <PanelMessage>
        Couldn't load sales by day.{' '}
        <Button size="small" onClick={sales.refetch}>
          Retry
        </Button>
      </PanelMessage>
    );
  }
  const block = sales.data.currencies.find((c) => c.currency === currency);
  if (!block || block.by_day.length === 0) return <PanelMessage>No sales in this period.</PanelMessage>;
  const points = chartPoints(block, range).map((p) => ({ date: p.date, amount: p.amount === null ? 0 : chartAmount(p.amount) }));
  return (
    <MoneyChart
      kind="bar"
      currency={currency}
      categories={narrow ? sparseDayLabels(points.map((p) => p.date)) : undefined}
      series={[{ name: 'Net sales', points, color: theme.palette.primary.main }]}
    />
  );
}

export interface SnapshotBodyProps {
  snapshot: Loadable<FinanceSnapshot>;
  sales: Loadable<FinanceSales>;
  range: Range;
  /** The store in view, carried on every link. */
  locationId?: string | null;
  /** Header controls: date range, store, Manage bank. */
  controls?: ReactNode;
}

export default function SnapshotBody({ snapshot, sales, range, locationId = null, controls }: SnapshotBodyProps) {
  const s = snapshot.data;
  const subtitle = s ? [basisLine(s), lastSyncedText(s)].filter(Boolean).join(' · ') : undefined;

  return (
    <>
      <PageHeader title="Finance & accounting" subtitle={subtitle} right={controls} />

      {s && isConflict(s) ? (
        <AlertStrip
          title="QuickBooks and Xero are both connected."
          body="Choose one in Settings so expenses can be read."
          action={{ label: 'Choose', to: '/settings?tab=integrations' }}
        />
      ) : null}

      {snapshot.isLoading ? (
        <>
          <TileRow>
            {TILE_TITLES.map((t) => (
              <KpiTile key={t} label={t} value="" loading />
            ))}
          </TileRow>
          <Box sx={{ mb: 2 }}>
            <Panel title="Net sales by day">
              <SalesChart sales={sales} currency="USD" range={range} />
            </Panel>
          </Box>
          <CardsSkeleton />
        </>
      ) : snapshot.isError || !s ? (
        <Retry message="Couldn't load your finance figures." onRetry={snapshot.refetch} />
      ) : (
        snapshotBlocks(s).map(({ heading, block }) => {
          const ctx = { source: s.expense_source, locationId };
          const unreviewed = unreviewedLine(block, range, locationId);
          const expenses = expenseCard(block, ctx);
          const cash = cashRows(block, ctx);
          return (
            <Box
              key={block.currency}
              component="section"
              aria-label={heading ? `Figures in ${heading}` : undefined}
              sx={{ mb: heading ? 3 : 0 }}
            >
              {heading ? (
                <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.dark', mb: 1 }}>
                  {heading}
                </Typography>
              ) : null}

              <TileRow>
                {tiles(block, range, locationId, s.expense_source).map((t) => (
                  <FigureTile
                    key={t.key}
                    view={t}
                    href={t.href}
                    footer={t.key === 'expenses' && unreviewed ? <InnerLink to={unreviewed.href}>{unreviewed.text}</InnerLink> : undefined}
                  />
                ))}
              </TileRow>

              <Box sx={{ mb: 2 }}>
                <Panel title="Net sales by day" note={heading ?? undefined}>
                  <SalesChart sales={sales} currency={block.currency} range={range} />
                </Panel>
              </Box>

              <Box sx={cardsGrid}>
                <Panel title="Sales by channel" action={viewLink(detailHref('sales_card', range, locationId))}>
                  {block.sales_by_channel.length ? (
                    <AmountRows rows={channelRows(block)} />
                  ) : (
                    <PanelMessage>No sales in this period.</PanelMessage>
                  )}
                </Panel>
                <Panel title="Expenses by category" action={viewLink(detailHref('expenses_card', range, locationId))}>
                  {expenses.unavailable ? (
                    <UnavailableMessage reason={expenses.unavailable} fixHref={expenses.fixHref} />
                  ) : (
                    <AmountRows rows={expenses.rows} />
                  )}
                </Panel>
                <Panel title="Cash" action={viewLink(detailHref('cash_card', range, locationId))}>
                  <FigureRowList rows={cash.rows} />
                  {cash.note ? <CardNote>{cash.note}</CardNote> : null}
                </Panel>
              </Box>

              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '10px',
                  bgcolor: 'background.paper',
                  overflow: 'hidden',
                  mb: 2
                }}
              >
                <StatsStrip stats={extrasRow(block, ctx).map((r) => statCell(r))} minWidth={200} />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Panel title="What you have and owe" action={viewLink(detailHref('position', range, locationId))}>
                  <StatsStrip stats={positionRows(block, ctx).map((r) => statCell(r, r.note))} minWidth={200} />
                </Panel>
              </Box>
            </Box>
          );
        })
      )}

      {s && !snapshot.isLoading && quickBooksLinks(s, range, locationId).length ? (
        <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 2 }}>
          From QuickBooks:{' '}
          {quickBooksLinks(s, range, locationId).map((l, i) => (
            <Box component="span" key={l.label}>
              {i > 0 ? ' · ' : null}
              <Link component={RouterLink} to={l.href} underline="hover" sx={{ fontWeight: 600 }}>
                {l.label}
              </Link>
            </Box>
          ))}
        </Typography>
      ) : null}
    </>
  );
}
