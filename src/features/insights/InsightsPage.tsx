// The top of the redesigned /insights page (S2): header, title block, mode
// pill, category chips and, until S3 brings the cards, a plain list of titles.
//
// InsightsPage owns the data and local state; InsightsPageView is props-only
// so it can be rendered statically in tests (no jsdom in this repo).

import { useCallback, useEffect, useState } from 'react';

import { Box, Breadcrumbs, Button, List, ListItem, Skeleton, Stack, Tooltip, Typography } from '@mui/material';

import { useSelector } from 'store';

import { getInsights } from './adapter';
import CategoryChips from './components/CategoryChips';
import ModePill, { type InsightsMode } from './components/ModePill';
import {
  categoryChips,
  effectiveFilter,
  formatImpact,
  insightsSubtitle,
  listedRecommendations,
  visibleRecommendations,
  type CategoryFilter
} from './insightsView';
import type { InsightsPayload } from './types';

export type InsightsLoad = { status: 'loading' } | { status: 'error' } | { status: 'ready'; payload: InsightsPayload };

export interface InsightsPageViewProps {
  load: InsightsLoad;
  /** Shown in the breadcrumb when the payload has no store name (live mode) or has not loaded. */
  fallbackStoreName: string;
  dismissedIds: readonly string[];
  filter: CategoryFilter;
  /** Local override of payload.mode; null = use the payload's. */
  modeOverride: InsightsMode | null;
  onFilter: (filter: CategoryFilter) => void;
  onModeChange: (mode: InsightsMode) => void;
  onRetry: () => void;
}

// recon.md lists no history route; S5 revisits this.
const HISTORY_ROUTE: string | null = null;

export function InsightsPageView({
  load,
  fallbackStoreName,
  dismissedIds,
  filter,
  modeOverride,
  onFilter,
  onModeChange,
  onRetry
}: InsightsPageViewProps) {
  const payload = load.status === 'ready' ? load.payload : null;
  const storeName = payload?.storeName || fallbackStoreName;
  const visible = payload ? visibleRecommendations(payload.recommendations, dismissedIds) : [];
  const chips = categoryChips(visible);
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
          {/* Placeholder until S3: S3 swaps each row for a card and keeps this list logic. */}
          {listed.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 3 }}>
              You are all caught up.
            </Typography>
          ) : (
            <List sx={{ mt: 2 }} data-insights-list>
              {listed.map((rec) => (
                <ListItem key={rec.id} divider data-rec-id={rec.id} sx={{ px: 0, gap: 2, justifyContent: 'space-between' }}>
                  <Typography>{rec.title}</Typography>
                  <Typography sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatImpact(rec.impact)}</Typography>
                </ListItem>
              ))}
            </List>
          )}
        </>
      )}
    </Box>
  );
}

export default function InsightsPage() {
  const companyName = useSelector((state) => state.auth?.currentRole?.company_name) ?? '';
  const [load, setLoad] = useState<InsightsLoad>({ status: 'loading' });
  // S3 adds to this when a card is dismissed.
  const [dismissedIds] = useState<string[]>([]);
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

  const handleModeChange = (mode: InsightsMode) => {
    // Local only until an endpoint stores the shop's mode.
    console.info(`[insights-redesign] mode set to ${mode} (local only)`);
    setModeOverride(mode);
  };

  return (
    <InsightsPageView
      load={load}
      fallbackStoreName={companyName}
      dismissedIds={dismissedIds}
      filter={filter}
      modeOverride={modeOverride}
      onFilter={setFilter}
      onModeChange={handleModeChange}
      onRetry={() => {
        fetchInsights();
      }}
    />
  );
}
