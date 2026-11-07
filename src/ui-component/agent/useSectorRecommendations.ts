import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// project imports
import { AgentAPI, type Sector } from 'api/agent.api';
import { PENDING_QUERY_KEY } from 'views/dashboard/RecommendationFeedback';

/**
 * One sector's live recommendations (`?surface=<sector>`), ranked server-side.
 *
 * The key is a CHILD of PENDING_QUERY_KEY (`[..., 'inventory']`), beside the
 * dashboard's `[..., 'dashboard']` and Inner Circle's `[..., 'inner-circle']`:
 * a different payload, so never a shared cache entry, but every existing prefix
 * invalidation (thumbs-up, snooze, Inner Circle saves) still reaches it.
 */
export const sectorPendingQueryKey = (surface: Sector) => [...PENDING_QUERY_KEY, surface];

export const useSectorRecommendations = (surface: Sector) => {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: sectorPendingQueryKey(surface),
    queryFn: () => AgentAPI.Recommendations.list({ surface }),
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  // The X removes the row in place: the dismissal drops it server-side and the
  // refetch returns the list without it. Invalidated by PREFIX, not just this
  // sector's key — a row dismissed here may have been the dashboard's top one,
  // and the dashboard must bring up its next. Returned, so `dismissing` lasts
  // until the refetch lands and the row never flashes back.
  const dismissMutation = useMutation({
    mutationFn: (id: string) => AgentAPI.Recommendations.dismiss(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PENDING_QUERY_KEY })
  });

  return {
    recommendations: list.data?.recommendations ?? [],
    ongoing: list.data?.ongoing ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error,
    refetch: list.refetch,
    dismiss: (id: string) => dismissMutation.mutate(id),
    dismissing: dismissMutation.isPending,
    dismissFailed: dismissMutation.isError
  };
};

export type SectorRecommendationsState = ReturnType<typeof useSectorRecommendations>;

export default useSectorRecommendations;
