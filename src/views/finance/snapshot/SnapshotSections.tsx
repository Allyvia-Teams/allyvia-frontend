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
import { AlertStrip, KpiRow, KpiTile, PageHeader, Panel, PanelMessage, StatsStrip, type StatCell } from 'ui-component/frame';
import MoneyChart from 'views/analytics/sections/MoneyChart';
import FigureTile, { FigureBadge, FigureValue, InnerLink } from './FigureTile';
import { chartAmount } from './snapshotFormat';
import {
  CLASSIC_HREF,
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

function Retry({ message, onRetry }: { message: string; onRetry: () => void }) {
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

const cardsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2, mb: 2 } as const;

/** Text-plus-amount rows inside a card. */
function AmountRows({ rows }: { rows: AmountLine[] }) {
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
            {r.label}
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
function FigureRowList({ rows }: { rows: FigureView[] }) {
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
          {r.secondary ? <Typography sx={{ mt: '2px', fontSize: '0.8125rem', color: 'text.disabled' }}>{r.secondary}</Typography> : null}
        </Box>
      ))}
    </Box>
  );
}

const statCell = (r: FigureView, note?: string | null): StatCell => ({
  label: r.label,
  value: <FigureValue view={r} size="tile" />,
  tag: <FigureBadge badge={r.badge} />,
  basis: r.secondary ?? note ?? undefined
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
  /** Header controls: date range, store, Manage bank. */
  controls?: ReactNode;
}

export default function SnapshotBody({ snapshot, sales, range, controls }: SnapshotBodyProps) {
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
          <KpiRow>
            {TILE_TITLES.map((t) => (
              <KpiTile key={t} label={t} value="" loading />
            ))}
          </KpiRow>
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
          const unreviewed = unreviewedLine(block, range);
          const expenses = expenseCard(block);
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

              <KpiRow>
                {tiles(block, range).map((t) => (
                  <FigureTile
                    key={t.key}
                    view={t}
                    href={t.href}
                    footer={t.key === 'expenses' && unreviewed ? <InnerLink to={unreviewed.href}>{unreviewed.text}</InnerLink> : undefined}
                  />
                ))}
              </KpiRow>

              <Box sx={{ mb: 2 }}>
                <Panel title="Net sales by day" note={heading ?? undefined}>
                  <SalesChart sales={sales} currency={block.currency} range={range} />
                </Panel>
              </Box>

              <Box sx={cardsGrid}>
                <Panel title="Sales by channel" action={viewLink(detailHref('sales_card', range))}>
                  {block.sales_by_channel.length ? (
                    <AmountRows rows={channelRows(block)} />
                  ) : (
                    <PanelMessage>No sales in this period.</PanelMessage>
                  )}
                </Panel>
                <Panel title="Expenses by category" action={viewLink(detailHref('expenses_card', range))}>
                  {expenses.unavailable ? (
                    <PanelMessage>
                      Not available
                      <Box component="span" sx={{ display: 'block', color: 'text.disabled', fontSize: '0.8125rem' }}>
                        {expenses.unavailable}
                      </Box>
                    </PanelMessage>
                  ) : (
                    <AmountRows rows={expenses.rows} />
                  )}
                </Panel>
                <Panel title="Cash" action={viewLink(detailHref('cash_card', range))}>
                  <FigureRowList rows={cashRows(block)} />
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
                <StatsStrip stats={extrasRow(block).map((r) => statCell(r))} minWidth={200} />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Panel title="What you have and owe" action={viewLink(detailHref('position', range))}>
                  <StatsStrip stats={positionRows(block).map((r) => statCell(r, r.note))} minWidth={200} />
                </Panel>
              </Box>
            </Box>
          );
        })
      )}

      {s && !snapshot.isLoading && quickBooksLinks(s, range).length ? (
        <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 2 }}>
          From QuickBooks:{' '}
          {quickBooksLinks(s, range).map((l, i) => (
            <Box component="span" key={l.label}>
              {i > 0 ? ' · ' : null}
              <Link component={RouterLink} to={l.href} underline="hover" sx={{ fontWeight: 600 }}>
                {l.label}
              </Link>
            </Box>
          ))}
        </Typography>
      ) : null}

      <Typography sx={{ fontSize: '0.8125rem', mt: 1 }}>
        <Link component={RouterLink} to={CLASSIC_HREF} underline="hover" color="text.secondary">
          Previous view
        </Link>
      </Typography>
    </>
  );
}
