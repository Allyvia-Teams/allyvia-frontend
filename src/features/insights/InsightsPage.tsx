// The top of the redesigned /insights page: header, title block, mode pill,
// category chips (S2), the recommendation cards with dismiss and undo (S3) and
// each card's rationale panel (S4), primary actions, the "Acted on" state and
// the View history link (S5).
//
// InsightsPage owns the data and local state; InsightsPageView is props-only
// so it can be rendered statically in tests (no jsdom in this repo).

import { useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { Box, Breadcrumbs, Button, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';

import { useSelector } from 'store';

import { dismissInsight, getInsightDetail, getInsights } from './adapter';
import CategoryChips from './components/CategoryChips';
import DismissToast from './components/DismissToast';
import ModePill from './components/ModePill';
import RecommendationCard from './components/RecommendationCard';
import RecommendationCardSkeleton from './components/RecommendationCardSkeleton';
import type { DismissReason, PendingDismissal } from './dismissals';
import {
  categoryChips,
  effectiveFilter,
  emptyMessage,
  insightsSubtitle,
  listedRecommendations,
  visibleRecommendations,
  type CategoryFilter
} from './insightsView';
import type { DetailLoad } from './rationale';
import type { InsightsPayload, Recommendation } from './types';
import { INSIGHTS_CONTAINER, NARROW_PAGE } from './layout';
import useRecommendationCards, { type RecommendationCardsSource } from './useRecommendationCards';

export type InsightsLoad = { status: 'loading' } | { status: 'error' } | { status: 'ready'; payload: InsightsPayload };

// /insights reads through adapter.ts, so VITE_INSIGHTS_REDESIGN still picks mock or live.
const CARDS_SOURCE: RecommendationCardsSource = {
  fetchPayload: () => getInsights(),
  fetchDetail: (id) => getInsightDetail(id),
  dismiss: (id, reason) => dismissInsight(id, reason)
};

export interface InsightsPageViewProps {
  load: InsightsLoad;
  /** Shown in the breadcrumb when the payload has no store name (live mode) or has not loaded. */
  fallbackStoreName: string;
  /** Cards off the list, including the one behind the undo toast. */
  dismissedIds: readonly string[];
  /** The dismissal the undo toast is showing; null when there is no toast. */
  pendingDismissal: PendingDismissal | null;
  filter: CategoryFilter;
  onFilter: (filter: CategoryFilter) => void;
  onRetry: () => void;
  onPrimary: (rec: Recommendation) => void;
  /** Cards whose primary action has run this visit: listed last, marked "Acted on". */
  actedIds: readonly string[];
  onDismiss: (rec: Recommendation, viaKeyboard: boolean) => void;
  onDismissReason: (reason: DismissReason | null) => void;
  onUndo: () => void;
  /** The undo toast timed out or was closed: the dismissal for `id` is final. */
  onCommitDismissal: (id: string) => void;
  onRationale: (id: string) => void;
  /** Cards whose rationale panel is open; several at once. */
  openIds: readonly string[];
  /** Each card's detail fetch, by rec id; absent until first expanded. */
  details: Readonly<Record<string, DetailLoad>>;
  /** Whether "Ask about this" has a chat to open (see askAbout.ts). */
  askAvailable: boolean;
  onRetryDetail: (id: string) => void;
  onAsk: (rec: Recommendation) => void;
}

// S5's minimal history page: this visit's actions, from the visit record.
export const HISTORY_ROUTE = '/insights/history';

export const LOAD_ERROR_MESSAGE = "We couldn't load this week's recommendations.";

// The rounded light-gray panel the cards sit on (S3). Loading and error states use it too, so nothing jumps.
const listPanelSx = (theme: Theme) => ({
  mt: 2.5,
  p: { xs: 1.5, sm: 2 },
  borderRadius: '16px',
  bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
  // The theme's ButtonBase focus ring, so the list matches every other control.
  '&:focus-visible': { outline: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`, outlineOffset: 2 }
});

export function InsightsPageView({
  load,
  fallbackStoreName,
  dismissedIds,
  pendingDismissal,
  filter,
  onFilter,
  onRetry,
  onPrimary,
  actedIds,
  onDismiss,
  onDismissReason,
  onUndo,
  onCommitDismissal,
  onRationale,
  openIds,
  details,
  askAvailable,
  onRetryDetail,
  onAsk
}: InsightsPageViewProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const payload = load.status === 'ready' ? load.payload : null;
  const storeName = payload?.storeName || fallbackStoreName;
  const visible = payload ? visibleRecommendations(payload.recommendations, dismissedIds) : [];
  const chips = categoryChips(payload?.recommendations ?? [], visible);
  const activeFilter = effectiveFilter(filter, chips);
  const listed = listedRecommendations(visible, activeFilter, actedIds);
  const mode = payload?.mode ?? 'save';

  return (
    <Box component="section" aria-label="Recommendations" sx={{ ...INSIGHTS_CONTAINER, mb: 4 }} data-insights-page>
      <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 2, fontSize: '0.875rem' }}>
        {storeName && <Typography color="text.secondary">{storeName}</Typography>}
        <Typography color="text.primary" aria-current="page">
          Insights
        </Typography>
      </Breadcrumbs>

      {/* Side by side from md: this theme's sm is 375px, where the mode pill and View history do not fit beside the title.
          Stacked again on a page under 600px (layout.ts). */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        useFlexGap
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'flex-start' },
          mb: 3,
          [NARROW_PAGE]: { flexDirection: 'column', alignItems: 'stretch' }
        }}
      >
        <Box>
          <Typography variant="h1" sx={{ fontSize: '2rem', fontWeight: 700, mb: 0.5 }}>
            Insights
          </Typography>
          {payload && (
            <Typography color="text.secondary" sx={{ fontSize: '0.9375rem' }} data-insights-subtitle>
              {insightsSubtitle(visible.length, payload.refreshedAt)}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {payload && <ModePill mode={mode} />}
          <Button variant="outlined" color="inherit" component={RouterLink} to={HISTORY_ROUTE}>
            View history
          </Button>
        </Stack>
      </Stack>

      {load.status === 'loading' && (
        <Box sx={listPanelSx} role="status" aria-busy="true" aria-label="Loading recommendations" data-insights-loading>
          <Stack spacing={2}>
            {[0, 1, 2].map((i) => (
              <RecommendationCardSkeleton key={i} />
            ))}
          </Stack>
        </Box>
      )}

      {load.status === 'error' && (
        <Box sx={listPanelSx}>
          <Box
            role="alert"
            data-insights-error
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: '12px',
              p: { xs: 2, md: 3 },
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              [NARROW_PAGE]: { p: 2, flexDirection: 'column', alignItems: 'flex-start' }
            }}
          >
            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.dark' }}>{LOAD_ERROR_MESSAGE}</Typography>
            <Button variant="outlined" color="inherit" onClick={onRetry} sx={{ minHeight: 40, borderColor: 'divider', flexShrink: 0 }}>
              Retry
            </Button>
          </Box>
        </Box>
      )}

      {payload && (
        <>
          <CategoryChips chips={chips} selected={activeFilter} onSelect={onFilter} />
          <Box ref={listRef} tabIndex={-1} aria-label="Recommendation cards" role="group" data-insights-list sx={listPanelSx}>
            {listed.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 5, px: 2, textAlign: 'center' }} data-insights-empty>
                {emptyMessage(visible.length, activeFilter)}
              </Typography>
            ) : (
              <Stack spacing={2}>
                {listed.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    rec={rec}
                    onPrimary={onPrimary}
                    acted={actedIds.includes(rec.id)}
                    onDismiss={onDismiss}
                    onRationale={onRationale}
                    open={openIds.includes(rec.id)}
                    detail={details[rec.id]}
                    askAvailable={askAvailable}
                    onRetryDetail={onRetryDetail}
                    onAsk={onAsk}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </>
      )}

      <DismissToast
        pending={pendingDismissal}
        onUndo={onUndo}
        onReason={onDismissReason}
        onCommit={onCommitDismissal}
        returnFocus={() => requestAnimationFrame(() => listRef.current?.focus())}
      />
    </Box>
  );
}

export default function InsightsPage() {
  const companyName = useSelector((state) => state.auth?.currentRole?.company_name) ?? '';
  const cards = useRecommendationCards(CARDS_SOURCE);
  const [filter, setFilter] = useState<CategoryFilter>('all');

  return (
    <InsightsPageView
      load={cards.load}
      fallbackStoreName={companyName}
      dismissedIds={cards.dismissedIds}
      pendingDismissal={cards.pendingDismissal}
      filter={filter}
      onFilter={setFilter}
      onRetry={cards.retry}
      onPrimary={cards.onPrimary}
      actedIds={cards.actedIds}
      onDismiss={cards.onDismiss}
      onDismissReason={cards.onDismissReason}
      onUndo={cards.onUndo}
      onCommitDismissal={cards.onCommitDismissal}
      onRationale={cards.onRationale}
      openIds={cards.openIds}
      details={cards.details}
      askAvailable={cards.askAvailable}
      onRetryDetail={cards.onRetryDetail}
      onAsk={cards.onAsk}
    />
  );
}
