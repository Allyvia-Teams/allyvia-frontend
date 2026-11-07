// views/inventory/workspace/TodayTab.tsx
//
// Today: what needs doing, as spec §5.4 lays it out. Top to bottom:
//
//   1. the health strip, five KpiTiles from three reads (the inventory
//      overview, on-order units, the open PO list); a read that failed shows
//      "—" and a Retry, never 0 (ALL-103);
//   2. the queue: the inventory sector's live agent rows, rendered with the
//      Insights redesign's RecommendationCard through the shared controller
//      (features/insights/useRecommendationCards) and banded Order now / This
//      week / Watch by today.ts, which joins each row to the reorder inbox by
//      suggestion id. The queue never waits on the inbox: until that list is
//      here every card sits in This week and the heading says "sorting…".
//      Under Order now, two or more rows sharing a supplier get one line that
//      drafts them as one purchase order;
//   3. every reorder suggestion, collapsed: the Reorder Inbox mounted as-is
//      (`embedded`), the front door above being the ranked queue.
//
// The rows are read through the sector query the workspace shell already
// holds (one request for the pill count and the queue), never through
// adapter.getInsights, so VITE_INSIGHTS_REDESIGN gates the /insights page only.
// Details and dismissals go to the live agent endpoints for the same reason.

import { useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { AgentAPI, type PendingRecommendation } from 'api/agent.api';
import { AnalyticsAPI } from 'api/analytics.api';
import { getOnOrder, listPurchaseOrders } from 'api/inventoryPurchasing.api';
import { createPurchaseOrdersFromSuggestions, listReorderSuggestions } from 'api/inventoryReorder.api';
import { dismissInsight, getInsightDetail } from 'features/insights/adapter';
import CollapsibleSection from 'features/insights/components/CollapsibleSection';
import DismissToast from 'features/insights/components/DismissToast';
import RecommendationCard from 'features/insights/components/RecommendationCard';
import { payloadFromAgent } from 'features/insights/fromAgent';
import { visibleRecommendations } from 'features/insights/insightsView';
import type { Recommendation } from 'features/insights/types';
import useRecommendationCards, { type RecommendationCardsSource } from 'features/insights/useRecommendationCards';
import { useSelector } from 'store';
import { sectorPendingQueryKey, useSectorRecommendations } from 'ui-component/agent/useSectorRecommendations';
import { KpiRow, KpiTile } from 'ui-component/frame';
import { PENDING_QUERY_KEY } from 'views/dashboard/RecommendationFeedback';

import { canOpenPlan, INSIGHTS_TO_PLAN } from '../flowLinks';
import { onOrderQuery, purchaseOrderListQuery } from '../purchasing';
import { normalizeReorderResponse, REORDER_FOCUS_PARAM, reorderListQuery, type ReorderSuggestion } from '../reorder';
import ReorderInbox from '../ReorderInbox';
import { inventoryHref, PO_ATTENTION_QUERY_KEY } from '../tabs';
import {
  BAND_LABELS,
  bandRows,
  bundleLine,
  draftPurchaseOrder,
  healthTiles,
  primaryActionFor,
  supplierBundles,
  TODAY_INBOX_QUERY_KEY,
  TODAY_OVERVIEW_QUERY_KEY,
  todayOnOrderQueryKey,
  type DraftDeps,
  type HealthTile,
  type SupplierBundle
} from '../today';
import OngoingDigest from './OngoingDigest';

const EM_DASH = '—';
const STALE_MS = 60_000;

/**
 * Whether a read has failed. The observer's optimistic result reports an
 * errored query with no data as pending (it would refetch on mount), so the
 * cache's own status is read too; after mount the two agree.
 */
const useFailed = (isError: boolean, key: readonly unknown[]): boolean => {
  const queryClient = useQueryClient();
  return isError || queryClient.getQueryState(key)?.status === 'error';
};

const RetryLink = ({ onClick }: { onClick: () => void }) => (
  <Link component="button" type="button" underline="hover" onClick={onClick} sx={{ font: 'inherit', color: 'inherit', p: 0 }}>
    Retry
  </Link>
);

const PlanLine = () => (
  <Typography component="div" variant="body2" color="text.secondary">
    {INSIGHTS_TO_PLAN.lead}{' '}
    <Link component={RouterLink} to={INSIGHTS_TO_PLAN.href} underline="hover" sx={{ fontWeight: 500 }}>
      {INSIGHTS_TO_PLAN.label}
    </Link>
  </Typography>
);

export default function TodayTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams] = useSearchParams();
  const roleType = useSelector((s) => s.auth.currentRole?.role_type as string | undefined);
  const locationId = searchParams.get('location_id');
  // A link that focuses a suggestion, or asks for the dismissed filter, lands on the open inbox.
  const openInbox = searchParams.has(REORDER_FOCUS_PARAM) || searchParams.has('status');

  // ---- the three strip reads + the inbox for banding ----
  const overview = useQuery({
    queryKey: TODAY_OVERVIEW_QUERY_KEY,
    queryFn: () => AnalyticsAPI.Inventory.getOverview('summary'),
    staleTime: STALE_MS,
    retry: false
  });
  const onOrder = useQuery({
    queryKey: todayOnOrderQueryKey(locationId),
    queryFn: () => getOnOrder(onOrderQuery({ locationId })),
    staleTime: STALE_MS,
    retry: false
  });
  const orders = useQuery({
    queryKey: PO_ATTENTION_QUERY_KEY,
    queryFn: () => listPurchaseOrders(purchaseOrderListQuery({ statuses: ['submitted', 'partially_received'] })),
    staleTime: STALE_MS,
    retry: false
  });
  const inbox = useQuery({
    queryKey: TODAY_INBOX_QUERY_KEY,
    queryFn: async () => normalizeReorderResponse(await listReorderSuggestions(reorderListQuery({}))),
    staleTime: STALE_MS,
    retry: false
  });
  const inboxItems: ReadonlyArray<ReorderSuggestion> | null = inbox.data?.items ?? null;
  const inboxFailed = useFailed(inbox.isError, TODAY_INBOX_QUERY_KEY);
  const overviewFailed = useFailed(overview.isError, TODAY_OVERVIEW_QUERY_KEY);
  const onOrderFailed = useFailed(onOrder.isError, todayOnOrderQueryKey(locationId));
  const ordersFailed = useFailed(orders.isError, PO_ATTENTION_QUERY_KEY);

  // ---- the rows (shared with the shell's pill count) and the cards ----
  const sector = useSectorRecommendations('inventory');
  const rowsRef = useRef<readonly PendingRecommendation[]>([]);
  rowsRef.current = sector.recommendations;
  const inboxRef = useRef(inboxItems);
  inboxRef.current = inboxItems;

  const actionFor = (recId: string) => {
    const row = rowsRef.current.find((r) => r.id === recId);
    return row ? primaryActionFor(row, inboxRef.current) : { kind: 'default' as const };
  };
  const refreshInbox = () => queryClient.invalidateQueries({ queryKey: TODAY_INBOX_QUERY_KEY });
  const draftDeps: DraftDeps = {
    create: async (payload) => {
      try {
        return await createPurchaseOrdersFromSuggestions(payload);
      } finally {
        // Whatever the answer, the suggestions it named may have moved.
        refreshInbox();
      }
    },
    navigate,
    notify: (message, tone) => enqueueSnackbar(message, { variant: tone })
  };

  const source: RecommendationCardsSource = {
    fetchPayload: async () => {
      const data = await queryClient.fetchQuery({
        queryKey: sectorPendingQueryKey('inventory'),
        queryFn: () => AgentAPI.Recommendations.list({ surface: 'inventory' }),
        staleTime: 5 * 60 * 1000
      });
      return payloadFromAgent(data.recommendations);
    },
    fetchDetail: (id) => getInsightDetail(id, { mode: 'live' }),
    dismiss: async (id, reason) => {
      await dismissInsight(id, reason, { mode: 'live' });
      await queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY });
    },
    // A reorder card with a live, supplied suggestion drafts its purchase
    // order straight from the inbox's own endpoint; everything else keeps the
    // cards' generic flow. A failed draft has been said out loud and is
    // thrown so the card is not marked acted on.
    primary: async (rec: Recommendation) => {
      const action = actionFor(rec.id);
      if (action.kind !== 'draft_po') return false;
      const outcome = await draftPurchaseOrder([action.suggestionId], draftDeps);
      if (outcome === 'failed') throw new Error('draft failed');
      return true;
    }
  };
  const cards = useRecommendationCards(source);

  // ---- the bundle line ----
  const [bundling, setBundling] = useState(false);
  const draftBundle = async (bundle: SupplierBundle) => {
    if (bundling) return;
    setBundling(true);
    try {
      await draftPurchaseOrder(bundle.suggestionIds, draftDeps);
    } finally {
      setBundling(false);
    }
  };

  // ---- the strip ----
  const tiles = healthTiles(overview.data?.summary ?? null, onOrder.data ?? null, orders.data ?? null, new Date());
  const tileSource = (key: HealthTile['key']) =>
    key === 'on_order'
      ? { failed: onOrderFailed, refetch: onOrder.refetch }
      : key === 'arriving'
        ? { failed: ordersFailed, refetch: orders.refetch }
        : { failed: overviewFailed, refetch: overview.refetch };

  // ---- the queue ----
  const payload = cards.load.status === 'ready' ? cards.load.payload : null;
  const visible = payload ? visibleRecommendations(payload.recommendations, cards.dismissedIds) : [];
  const bands = bandRows(visible, sector.recommendations, inboxItems);
  const rowsById = new Map(sector.recommendations.map((row) => [row.id, row]));
  // Nothing is sorted until the inbox is here; a failed read sorts nothing and says nothing.
  const sortingSuffix = inboxItems === null && !inboxFailed ? ' · sorting…' : '';
  const inboxCount = inboxItems ? inboxItems.length : null;

  let queue: React.ReactNode;
  if (cards.load.status === 'loading') {
    queue = (
      <Stack spacing={1.5} aria-busy="true" aria-label="Loading recommendations" data-today-loading>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={56} />
        ))}
      </Stack>
    );
  } else if (cards.load.status === 'error') {
    queue = (
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }} role="alert" data-today-error>
        <Typography color="error">Could not load recommendations.</Typography>
        <Button size="small" variant="outlined" onClick={cards.retry}>
          Retry
        </Button>
      </Stack>
    );
  } else if (visible.length === 0) {
    queue = (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }} data-today-empty>
        No inventory recommendations right now.
      </Typography>
    );
  } else {
    queue = (
      <Stack spacing={3}>
        {bands.map(({ band, cards: bandCards }) => {
          const bundles =
            band === 'order_now' && inboxItems
              ? supplierBundles(
                  bandCards.map((card) => rowsById.get(card.id)).filter((row): row is PendingRecommendation => Boolean(row)),
                  inboxItems
                )
              : [];
          return (
            <Box key={band} component="section" aria-label={BAND_LABELS[band]} data-today-band={band}>
              <Typography component="h2" variant="h4" sx={{ mb: 1.5 }}>
                {BAND_LABELS[band]}
                {sortingSuffix}
              </Typography>
              {bundles.length > 0 && (
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1.5 }}>
                  {bundles.map((bundle) => (
                    <Button key={bundle.supplierId} size="small" variant="outlined" disabled={bundling} onClick={() => draftBundle(bundle)}>
                      {bundleLine(bundle)}
                    </Button>
                  ))}
                </Stack>
              )}
              <Stack spacing={2}>
                {bandCards.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    // The button says what the click does: a card that drafts says so.
                    rec={
                      actionFor(rec.id).kind === 'draft_po'
                        ? { ...rec, primaryAction: { ...rec.primaryAction, label: 'Draft purchase order' } }
                        : rec
                    }
                    onPrimary={cards.onPrimary}
                    acted={cards.actedIds.includes(rec.id)}
                    onDismiss={cards.onDismiss}
                    onRationale={cards.onRationale}
                    open={cards.openIds.includes(rec.id)}
                    detail={cards.details[rec.id]}
                    askAvailable={cards.askAvailable}
                    onRetryDetail={cards.onRetryDetail}
                    onAsk={cards.onAsk}
                  />
                ))}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <KpiRow>
        {tiles.map((tile) => {
          const { failed, refetch } = tileSource(tile.key);
          return (
            <KpiTile
              key={tile.key}
              label={tile.label}
              value={tile.value ?? EM_DASH}
              basis={tile.value === null && failed ? <RetryLink onClick={() => refetch()} /> : tile.basis}
              tone={tile.tone}
              loading={tile.value === null && !failed}
            />
          );
        })}
      </KpiRow>

      <Box
        tabIndex={-1}
        role="group"
        aria-label="Recommendation cards"
        sx={(theme) => ({
          p: { xs: 1.5, sm: 2 },
          borderRadius: '16px',
          bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50'
        })}
      >
        {queue}
        {cards.load.status === 'ready' && sector.ongoing.length > 0 && <OngoingDigest items={sector.ongoing} />}
      </Box>

      <DismissToast
        pending={cards.pendingDismissal}
        onUndo={cards.onUndo}
        onReason={cards.onDismissReason}
        onCommit={cards.onCommitDismissal}
        returnFocus={() => undefined}
      />

      <CollapsibleSection
        name="inventory-today-inbox"
        title={inboxCount === null ? 'All reorder suggestions' : `All reorder suggestions (${inboxCount})`}
        defaultOpen={openInbox}
      >
        <ReorderInbox embedded onChanged={refreshInbox} />
      </CollapsibleSection>

      <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'baseline', pb: 2 }}>
        <Typography component="div" variant="body2" color="text.secondary">
          Dismissed this week{' · '}
          <Link
            component={RouterLink}
            to={inventoryHref('today', null, { status: 'dismissed' })}
            underline="hover"
            sx={{ fontWeight: 500 }}
          >
            show
          </Link>
        </Typography>
        {canOpenPlan(roleType) && <PlanLine />}
      </Stack>
    </Stack>
  );
}
