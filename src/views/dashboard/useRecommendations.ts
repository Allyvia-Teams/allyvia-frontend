import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// project imports
import { AgentAPI, GenerateRecommendationResponse, PendingRecommendationsResponse } from 'api/agent.api';
import { PENDING_QUERY_KEY } from './RecommendationFeedback';

/**
 * The dashboard's own list: `surface=dashboard&limit=1`, the single top-ranked
 * row across every sector. A CHILD of PENDING_QUERY_KEY, like the Inner Circle
 * key (`[..., 'inner-circle']`) and the sector tabs' (`[..., 'inventory']`), so
 * every existing prefix invalidation (thumbs, snooze, Inner Circle saves) still
 * reaches it — and so it never shares a cache entry with a sector list, whose
 * payload is a different set of rows.
 */
export const DASHBOARD_PENDING_QUERY_KEY = [...PENDING_QUERY_KEY, 'dashboard'];

// Cosmetic only — the backend doesn't report per-step progress, so we rotate
// through plausible status text for the duration of the (5-30s) agent run.
const GENERATING_STATUS_MESSAGES = [
  'Analyzing sales trends…',
  'Checking inventory…',
  'Reading weather signals…',
  'Reviewing customer preferences…',
  'Weighing supplier risk…'
];

const useRotatingStatus = (active: boolean, messages: string[], intervalMs = 1800) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return undefined;
    }
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, messages, intervalMs]);

  return messages[index];
};

const isNotSurfacedResponse = (data: GenerateRecommendationResponse): data is { surfaced: false; reason: string } =>
  'surfaced' in data && data.surfaced === false;

const isAlreadyGeneratedResponse = (data: GenerateRecommendationResponse): boolean =>
  'already_generated' in data && data.already_generated === true;

const isTimeoutError = (error: unknown): boolean => {
  const err = error as { code?: string; message?: string } | null;
  return err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message ?? '');
};

const isConflictError = (error: unknown): boolean => {
  const err = error as { response?: { status?: number } } | null;
  return err?.response?.status === 409;
};

// A gateway/proxy timeout (LB or Cloud Run returning 502/503/504) usually means
// the request outran an upstream timeout while the agent run is still finishing
// server-side — the recommendation typically lands in the DB moments later. Poll
// for it instead of treating this as a hard failure.
const isGatewayError = (error: unknown): boolean => {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  return status === 502 || status === 503 || status === 504;
};

const CONFLICT_POLL_INTERVAL_MS = 5000;
const CONFLICT_POLL_TIMEOUT_MS = 60000;

// ==============================|| RECOMMENDATIONS - STATE ||============================== //
// The pending list, the alerts that ride with it, and the generate action.
// Lifted out of the card so the page header can own the "Generate
// recommendation" button (design handoff Part 2) while the panel renders the
// list; both read one hook instance passed down from the page.

export const useRecommendations = () => {
  const queryClient = useQueryClient();
  const [notSurfacedReason, setNotSurfacedReason] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [polling, setPolling] = useState(false);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);
  // True once the merchant has dismissed a row this session, so an empty list
  // reads "That was the last one" rather than "Nothing surfaced yet".
  const [dismissedSome, setDismissedSome] = useState(false);

  // Another request (e.g. a double-click) is already generating a recommendation
  // for this company. Rather than surfacing that as an error, poll the pending
  // list until the in-flight run finishes or we give up after 60s.
  useEffect(() => {
    if (!polling) return undefined;

    const start = Date.now();
    const id = setInterval(async () => {
      if (Date.now() - start >= CONFLICT_POLL_TIMEOUT_MS) {
        setPolling(false);
        return;
      }
      // EXACT, on the dashboard's own key. PENDING_QUERY_KEY has children
      // (`[..., 'inner-circle']`, the sector tabs), and a prefix refetch here
      // would fire up to twelve extra `GET …/recommendations/` — each running
      // the health assessment over 91 days of revenue, expense and inventory
      // aggregates — from the Dashboard while the agent is generating. The
      // `getQueryData` below is exact too; the two must agree about intent.
      await queryClient.refetchQueries({ queryKey: DASHBOARD_PENDING_QUERY_KEY, exact: true });
      const latest = queryClient.getQueryData<PendingRecommendationsResponse>(DASHBOARD_PENDING_QUERY_KEY);
      if (latest && latest.recommendations.length > 0) {
        setPolling(false);
      }
    }, CONFLICT_POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [polling, queryClient]);

  // The backend ranks and limits; the client never re-sorts (decision 1 in the
  // surfacing sessions doc: one rank function, server-side).
  const list = useQuery({
    queryKey: DASHBOARD_PENDING_QUERY_KEY,
    queryFn: () => AgentAPI.Recommendations.list({ surface: 'dashboard', limit: 1 }),
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  const generateMutation = useMutation({
    mutationFn: (force?: boolean) => AgentAPI.Recommendations.generate(force),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY });
      setNotSurfacedReason(isNotSurfacedResponse(data) ? data.reason : null);
      // The run was skipped because today's agent recommendation is still
      // live. Said out loud: this used to read as a silent success, a click
      // with no visible effect.
      setAlreadyGenerated(isAlreadyGeneratedResponse(data));
    },
    onError: (error) => {
      // Another request is already generating for this company (409), or an
      // upstream gateway (LB/Cloud Run) timed out the request (502/503/504)
      // while the run finishes server-side. In both cases the recommendation is
      // likely still being written — poll for it instead of showing an error.
      if (isConflictError(error) || isGatewayError(error)) {
        setPolling(true);
        return;
      }
      // The request can time out client-side while the run finishes server-side.
      // Give it one delayed recheck before showing an error — a slow-but-successful
      // run should just show up, not send the merchant down a needless retry.
      if (!isTimeoutError(error)) return;
      setRecovering(true);
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: DASHBOARD_PENDING_QUERY_KEY, exact: true }).finally(() => setRecovering(false));
      }, 3000);
    }
  });

  // The X: "not this one, show me the next". The dismissed row leaves the
  // ranked set server-side, so refetching the dashboard key brings up the next
  // best. Invalidated by PREFIX so a mounted sector tab drops the row too (one
  // request per mounted surface). The invalidation is RETURNED, so the
  // mutation stays pending until the refetch lands: `dismissing` then covers
  // the whole swap and the dismissed row never flashes back.
  const dismissMutation = useMutation({
    mutationFn: (id: string) => AgentAPI.Recommendations.dismiss(id),
    onSuccess: () => {
      setDismissedSome(true);
      setAlreadyGenerated(false);
      return queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY });
    }
  });

  const working = generateMutation.isPending || recovering || polling;
  const statusText = useRotatingStatus(generateMutation.isPending || recovering, GENERATING_STATUS_MESSAGES);

  const generate = (force?: boolean) => {
    setNotSurfacedReason(null);
    setPolling(false);
    setAlreadyGenerated(false);
    setDismissedSome(false);
    generateMutation.mutate(force);
  };

  const dismiss = (id: string) => dismissMutation.mutate(id);

  return {
    recommendations: list.data?.recommendations ?? [],
    alerts: list.data?.alerts ?? [],
    // 0 when absent, never undefined: the card branches on `> 0`, and an
    // undefined there would make "no Inner Circle suggestions" and "this
    // backend does not report them" render identically by accident rather
    // than by decision. They do render identically — the row is hidden —
    // but that is now the stated rule rather than a falsy coincidence.
    innerCirclePending: list.data?.inner_circle_pending ?? 0,
    // `?? {}` / undefined: a backend without the surfacing change omits both.
    remainingBySector: list.data?.remaining_by_sector ?? {},
    totalLive: list.data?.total_live,
    isLoading: list.isLoading,
    isError: list.isError,
    listError: list.error,
    refetch: list.refetch,
    generate,
    working,
    polling,
    statusText: polling ? 'Still working on it…' : statusText,
    generateFailed: generateMutation.isError,
    notSurfacedReason,
    alreadyGenerated,
    dismiss,
    dismissing: dismissMutation.isPending,
    dismissFailed: dismissMutation.isError,
    dismissedSome
  };
};

export type RecommendationsState = ReturnType<typeof useRecommendations>;
