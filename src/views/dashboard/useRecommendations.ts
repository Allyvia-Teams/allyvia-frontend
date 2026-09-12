import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// project imports
import { AgentAPI, GenerateRecommendationResponse, PendingRecommendationsResponse } from 'api/agent.api';
import { PENDING_QUERY_KEY } from './RecommendationFeedback';

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
      await queryClient.refetchQueries({ queryKey: PENDING_QUERY_KEY });
      const latest = queryClient.getQueryData<PendingRecommendationsResponse>(PENDING_QUERY_KEY);
      if (latest && latest.recommendations.length > 0) {
        setPolling(false);
      }
    }, CONFLICT_POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [polling, queryClient]);

  const list = useQuery({
    queryKey: PENDING_QUERY_KEY,
    queryFn: () => AgentAPI.Recommendations.list(),
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  const generateMutation = useMutation({
    mutationFn: (force?: boolean) => AgentAPI.Recommendations.generate(force),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY });
      setNotSurfacedReason(isNotSurfacedResponse(data) ? data.reason : null);
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
        queryClient.refetchQueries({ queryKey: PENDING_QUERY_KEY }).finally(() => setRecovering(false));
      }, 3000);
    }
  });

  const working = generateMutation.isPending || recovering || polling;
  const statusText = useRotatingStatus(generateMutation.isPending || recovering, GENERATING_STATUS_MESSAGES);

  const generate = (force?: boolean) => {
    setNotSurfacedReason(null);
    setPolling(false);
    generateMutation.mutate(force);
  };

  return {
    recommendations: list.data?.recommendations ?? [],
    alerts: list.data?.alerts ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    listError: list.error,
    refetch: list.refetch,
    generate,
    working,
    polling,
    statusText: polling ? 'Still working on it…' : statusText,
    generateFailed: generateMutation.isError,
    notSurfacedReason
  };
};

export type RecommendationsState = ReturnType<typeof useRecommendations>;
