// The top of the redesigned /insights page: header, title block, mode pill,
// category chips (S2), the recommendation cards with dismiss and undo (S3) and
// each card's rationale panel (S4), primary actions, the "Acted on" state and
// the View history link (S5).
//
// InsightsPage owns the data and local state; InsightsPageView is props-only
// so it can be rendered statically in tests (no jsdom in this repo).

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import { Box, Breadcrumbs, Button, Skeleton, Stack, Typography } from '@mui/material';

import { useSelector } from 'store';

import { dismissInsight, getInsightDetail, getInsights } from './adapter';
import { actOnRecommendation } from './actions';
import { askAboutInsight, INSIGHT_CHAT } from './askAbout';
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
import { closeRationale, createDetailCache, toggleOpen, type DetailLoad } from './rationale';
import type { InsightsPayload, Recommendation } from './types';
import { readVisitRecord, recordDismissed, sessionStore } from './visitRecord';

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
  const mode = modeOverride ?? payload?.mode ?? 'save';

  return (
    <Box component="section" aria-label="Recommendations" sx={{ mb: 4 }} data-insights-page>
      <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 2, fontSize: '0.875rem' }}>
        {storeName && <Typography color="text.secondary">{storeName}</Typography>}
        <Typography color="text.primary" aria-current="page">
          Insights
        </Typography>
      </Breadcrumbs>

      {/* Side by side from md: this theme's sm is 375px, where the mode pill and View history do not fit beside the title. */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' }, mb: 3 }}
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
          <Button variant="outlined" color="inherit" component={RouterLink} to={HISTORY_ROUTE}>
            View history
          </Button>
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

/** Send one final dismissal. The card is already gone; a failure is logged, not shown (see data-spec 4.1). */
export const sendDismissal = ({ id, reason }: FinalDismissal) => {
  dismissInsight(id, reason ?? undefined).catch((error: unknown) => {
    console.warn(`[insights-redesign] dismissInsight(${id}) failed`, error);
  });
};

/** Send a final dismissal and write it to this visit's record, so /insights/history and a return visit see it. */
const finalizeDismissal = (refreshedAt: string | null, dismissal: FinalDismissal) => {
  sendDismissal(dismissal);
  if (refreshedAt !== null) recordDismissed(sessionStore(), refreshedAt, dismissal);
};

const union = (a: readonly string[], b: readonly string[]) => [...new Set([...a, ...b])];

export default function InsightsPage() {
  const companyName = useSelector((state) => state.auth?.currentRole?.company_name) ?? '';
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [load, setLoad] = useState<InsightsLoad>({ status: 'loading' });
  // The loaded payload's refreshedAt: the visit record's key.
  const refreshedAtRef = useRef<string | null>(null);
  const [dismissal, setDismissal] = useState(INITIAL_DISMISS_STATE);
  // The latest state for event handlers and the unmount cleanup, so a
  // dismissal is never decided from a stale render.
  const dismissalRef = useRef(dismissal);
  const [actedIds, setActedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [modeOverride, setModeOverride] = useState<InsightsMode | null>(null);
  // Rationale panels: open state is page-local and never persisted; details
  // are cached per id for the page's lifetime (rationale.ts).
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<string, DetailLoad>>({});
  const detailsRef = useRef(details);
  const detailCache = useRef(createDetailCache((id) => getInsightDetail(id))).current;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchInsights = useCallback(() => {
    let cancelled = false;
    setLoad({ status: 'loading' });
    getInsights()
      .then((payload) => {
        if (cancelled) return;
        // Coming back from an action's flow: restore this visit's dismissed and acted-on cards.
        const known = new Set(payload.recommendations.map((rec) => rec.id));
        const record = readVisitRecord(sessionStore(), payload.refreshedAt);
        const restoredDismissed = record.dismissed.map((e) => e.id).filter((id) => known.has(id));
        const restoredActed = record.acted.map((e) => e.id).filter((id) => known.has(id));
        refreshedAtRef.current = payload.refreshedAt;
        dismissalRef.current = { ...dismissalRef.current, dismissedIds: union(dismissalRef.current.dismissedIds, restoredDismissed) };
        setDismissal(dismissalRef.current);
        setActedIds((current) => union(current, restoredActed));
        setLoad({ status: 'ready', payload });
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
    const next = runDismissAction(dismissalRef.current, action, (final) => finalizeDismissal(refreshedAtRef.current, final));
    dismissalRef.current = next;
    setDismissal(next);
  }, []);

  // Leaving the page with a toast open makes that dismissal final, as a timeout would.
  useEffect(
    () => () => {
      const { pending } = dismissalRef.current;
      if (pending) finalizeDismissal(refreshedAtRef.current, pending);
    },
    []
  );

  const setDetail = useCallback((id: string, detailLoad: DetailLoad) => {
    if (!mounted.current) return;
    detailsRef.current = { ...detailsRef.current, [id]: detailLoad };
    setDetails(detailsRef.current);
  }, []);

  const loadDetail = useCallback(
    (id: string) => {
      setDetail(id, { status: 'loading' });
      detailCache
        .get(id)
        .then((detail) => setDetail(id, { status: 'ready', detail }))
        .catch((error: unknown) => {
          console.warn(`[insights-redesign] getInsightDetail(${id}) failed`, error);
          setDetail(id, { status: 'error' });
        });
    },
    [detailCache, setDetail]
  );

  const handleRationale = (id: string) => {
    const opening = !openIds.includes(id);
    setOpenIds((current) => toggleOpen(current, id));
    const known = detailsRef.current[id];
    // First expand fetches; a failed fetch is tried again on re-expand. A loaded or loading one is left alone.
    if (opening && (!known || known.status === 'error')) loadDetail(id);
  };

  // Runs the card's flow; anything but coming_soon marks it acted on (actions.ts).
  const handlePrimary = (rec: Recommendation) => {
    actOnRecommendation(rec, {
      navigate,
      notify: (message) => enqueueSnackbar(message, { variant: 'info' }),
      storage: sessionStore(),
      refreshedAt: refreshedAtRef.current,
      onActed: (id) => {
        if (mounted.current) setActedIds((current) => union(current, [id]));
      }
    }).catch((error: unknown) => console.warn(`[insights-redesign] primary action for ${rec.id} failed`, error));
  };

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
      onPrimary={handlePrimary}
      actedIds={actedIds}
      onDismiss={(rec, viaKeyboard) => {
        // Undo brings the card back collapsed.
        setOpenIds((current) => closeRationale(current, rec.id));
        dispatchDismissal({ type: 'dismiss', rec, focusUndo: viaKeyboard });
      }}
      onDismissReason={(reason) => dispatchDismissal({ type: 'reason', reason })}
      onUndo={() => dispatchDismissal({ type: 'undo' })}
      onCommitDismissal={(id) => dispatchDismissal({ type: 'commit', id })}
      onRationale={handleRationale}
      openIds={openIds}
      details={details}
      askAvailable={INSIGHT_CHAT !== null}
      onRetryDetail={loadDetail}
      onAsk={(rec) => {
        askAboutInsight(rec);
      }}
    />
  );
}
