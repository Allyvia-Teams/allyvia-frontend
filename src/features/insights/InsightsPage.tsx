// The top of the redesigned /insights page: header, title block, mode pill,
// category chips (S2) and the recommendation cards with dismiss and undo (S3).
//
// InsightsPage owns the data and local state; InsightsPageView is props-only
// so it can be rendered statically in tests (no jsdom in this repo).

import { useCallback, useEffect, useRef, useState } from 'react';

import { Box, Breadcrumbs, Button, Skeleton, Stack, Tooltip, Typography } from '@mui/material';

import { useSelector } from 'store';

import { dismissInsight, getInsights } from './adapter';
import CategoryChips from './components/CategoryChips';
import DismissToast from './components/DismissToast';
import ModePill, { type InsightsMode } from './components/ModePill';
import RecommendationCard from './components/RecommendationCard';
import {
  INITIAL_DISMISS_STATE,
  runDismissAction,
  type DismissAction,
  type DismissReason,
  type FinalDismissal,
  type PendingDismissal
} from './dismissals';
import {
  categoryChips,
  effectiveFilter,
  emptyMessage,
  insightsSubtitle,
  listedRecommendations,
  visibleRecommendations,
  type CategoryFilter
} from './insightsView';
import type { InsightsPayload, Recommendation } from './types';

export type InsightsLoad = { status: 'loading' } | { status: 'error' } | { status: 'ready'; payload: InsightsPayload };

export interface InsightsPageViewProps {
  load: InsightsLoad;
  /** Shown in the breadcrumb when the payload has no store name (live mode) or has not loaded. */
  fallbackStoreName: string;
  /** Cards off the list, including the one behind the undo toast. */
  dismissedIds: readonly string[];
  /** The dismissal the undo toast is showing; null when there is no toast. */
  pendingDismissal: PendingDismissal | null;
  filter: CategoryFilter;
  /** Local override of payload.mode; null = use the payload's. */
  modeOverride: InsightsMode | null;
  onFilter: (filter: CategoryFilter) => void;
  onModeChange: (mode: InsightsMode) => void;
  onRetry: () => void;
  onPrimary: (id: string) => void;
  onDismiss: (rec: Recommendation, viaKeyboard: boolean) => void;
  onDismissReason: (reason: DismissReason | null) => void;
  onUndo: () => void;
  /** The undo toast timed out or was closed: the dismissal for `id` is final. */
  onCommitDismissal: (id: string) => void;
  onRationale: (id: string) => void;
}

// recon.md lists no history route; S5 revisits this.
const HISTORY_ROUTE: string | null = null;

export function InsightsPageView({
  load,
  fallbackStoreName,
  dismissedIds,
  pendingDismissal,
  filter,
  modeOverride,
  onFilter,
  onModeChange,
  onRetry,
  onPrimary,
  onDismiss,
  onDismissReason,
  onUndo,
  onCommitDismissal,
  onRationale
}: InsightsPageViewProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const payload = load.status === 'ready' ? load.payload : null;
  const storeName = payload?.storeName || fallbackStoreName;
  const visible = payload ? visibleRecommendations(payload.recommendations, dismissedIds) : [];
  const chips = categoryChips(payload?.recommendations ?? [], visible);
  const activeFilter = effectiveFilter(filter, chips);
  const listed = listedRecommendations(visible, activeFilter);
  const mode = modeOverride ?? payload?.mode ?? 'save';

  return (
    <Box component="section" aria-label="Recommendations" sx={{ mb: 4 }} data-insights-page>
      <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 2, fontSize: '0.875rem' }}>
        {storeName && <Typography color="text.secondary">{storeName}</Typography>}
        <Typography color="text.primary" aria-current="page">
          Insights
        </Typography>
      </Breadcrumbs>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' }, mb: 3 }}
      >
        <Box>
          <Typography variant="h1" sx={{ fontSize: '2rem', fontWeight: 700, mb: 0.5 }}>
            Insights
          </Typography>
          {payload && (
            <Typography color="text.secondary" data-insights-subtitle>
              {insightsSubtitle(visible.length, payload.refreshedAt)}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {payload && <ModePill mode={mode} onChange={onModeChange} />}
          {HISTORY_ROUTE ? (
            <Button variant="outlined" color="inherit" href={HISTORY_ROUTE}>
              View history
            </Button>
          ) : (
            <Tooltip title="Coming soon">
              <span>
                <Button variant="outlined" color="inherit" disabled>
                  View history
                </Button>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {load.status === 'loading' && (
        <Stack spacing={1.5} aria-busy="true" aria-label="Loading recommendations" data-insights-loading>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      )}

      {load.status === 'error' && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }} role="alert" data-insights-error>
          <Typography color="error">Could not load recommendations.</Typography>
          <Button size="small" variant="outlined" onClick={onRetry}>
            Retry
          </Button>
        </Stack>
      )}

      {payload && (
        <>
          <CategoryChips chips={chips} selected={activeFilter} onSelect={onFilter} />
          <Box
            ref={listRef}
            tabIndex={-1}
            aria-label="Recommendation cards"
            role="group"
            data-insights-list
            sx={(theme) => ({
              mt: 2.5,
              p: { xs: 1.5, sm: 2 },
              borderRadius: '16px',
              bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
              '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
            })}
          >
            {listed.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 5, px: 2, textAlign: 'center' }} data-insights-empty>
                {emptyMessage(visible.length, activeFilter)}
              </Typography>
            ) : (
              <Stack spacing={2}>
                {listed.map((rec) => (
                  <RecommendationCard key={rec.id} rec={rec} onPrimary={onPrimary} onDismiss={onDismiss} onRationale={onRationale} />
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

/** Send one final dismissal. The card is already gone; a failure is logged, not shown (see data-spec 4.1). */
export const sendDismissal = ({ id, reason }: FinalDismissal) => {
  dismissInsight(id, reason ?? undefined).catch((error: unknown) => {
    console.warn(`[insights-redesign] dismissInsight(${id}) failed`, error);
  });
};

export default function InsightsPage() {
  const companyName = useSelector((state) => state.auth?.currentRole?.company_name) ?? '';
  const [load, setLoad] = useState<InsightsLoad>({ status: 'loading' });
  const [dismissal, setDismissal] = useState(INITIAL_DISMISS_STATE);
  // The latest state for event handlers and the unmount cleanup, so a
  // dismissal is never decided from a stale render.
  const dismissalRef = useRef(dismissal);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [modeOverride, setModeOverride] = useState<InsightsMode | null>(null);

  const fetchInsights = useCallback(() => {
    let cancelled = false;
    setLoad({ status: 'loading' });
    getInsights()
      .then((payload) => {
        if (!cancelled) setLoad({ status: 'ready', payload });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn('[insights-redesign] getInsights failed', error);
        setLoad({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => fetchInsights(), [fetchInsights]);

  const dispatchDismissal = useCallback((action: DismissAction) => {
    const next = runDismissAction(dismissalRef.current, action, sendDismissal);
    dismissalRef.current = next;
    setDismissal(next);
  }, []);

  // Leaving the page with a toast open makes that dismissal final, as a timeout would.
  useEffect(
    () => () => {
      const { pending } = dismissalRef.current;
      if (pending) sendDismissal(pending);
    },
    []
  );

  const handleModeChange = (mode: InsightsMode) => {
    // Local only until an endpoint stores the shop's mode.
    console.info(`[insights-redesign] mode set to ${mode} (local only)`);
    setModeOverride(mode);
  };

  return (
    <InsightsPageView
      load={load}
      fallbackStoreName={companyName}
      dismissedIds={dismissal.dismissedIds}
      pendingDismissal={dismissal.pending}
      filter={filter}
      modeOverride={modeOverride}
      onFilter={setFilter}
      onModeChange={handleModeChange}
      onRetry={() => {
        fetchInsights();
      }}
      onPrimary={(id) => console.info(`[insights-redesign] primary action for ${id} (not wired yet)`)}
      onDismiss={(rec, viaKeyboard) => dispatchDismissal({ type: 'dismiss', rec, focusUndo: viaKeyboard })}
      onDismissReason={(reason) => dispatchDismissal({ type: 'reason', reason })}
      onUndo={() => dispatchDismissal({ type: 'undo' })}
      onCommitDismissal={(id) => dispatchDismissal({ type: 'commit', id })}
      onRationale={(id) => console.info(`[insights-redesign] rationale for ${id} (S4 opens it)`)}
    />
  );
}
