import { useMutation, useQueryClient } from '@tanstack/react-query';

import posApi from '../api/posApi';
import type { MemberLookupResponse, MemberLookupStatus } from '../types/pos.types';

/**
 * Look up (and, if new, enrol) an Inner Circle number from the till.
 *
 * A MUTATION, NOT A QUERY, for three reasons worth keeping written down:
 * it is a POST; it CREATES server state (a member and a store link), which
 * makes it the least cacheable call in the app — replaying a cached
 * "created" would be a lie; and a query would refetch on window focus and
 * on reconnect, spending a unit of the shared per-phone budget every time
 * the clerk alt-tabs.
 *
 * The hook classifies nothing and formats no copy. It hands the raw
 * rejection through as `unknown` and utils/memberLookupView duck-types it,
 * which is what keeps every state — including the 429 — testable in a repo
 * with no DOM.
 */
export function useMemberLookup() {
  const queryClient = useQueryClient();

  const mutation = useMutation<MemberLookupResponse, unknown, string>({
    mutationKey: ['pos-member-lookup'],
    mutationFn: (phone) => posApi.memberLookup(phone),
    // Explicit even though it is the default: an automatic retry on a 429
    // deepens a throttle that every till in the deployment shares.
    retry: false,
    onSuccess: () => {
      // A lookup can create a member and a link, so these lists are genuinely
      // stale afterwards. Not ['customer-detail'] — that key is id-scoped and
      // the response deliberately carries no id.
      queryClient.invalidateQueries({ queryKey: ['inner-circle-summary'] });
      queryClient.invalidateQueries({ queryKey: ['inner-circle-customers'] });
      queryClient.invalidateQueries({ queryKey: ['inner-circle-action-queue'] });
    }
  });

  return {
    lookup: (phone: string) => mutation.mutate(phone),
    reset: () => mutation.reset(),
    isPending: mutation.isPending,
    // react-query v5 retains `variables` after settle, so this is what the
    // result belongs to — no second piece of state needed.
    attemptedPhone: (mutation.variables as string | undefined) ?? null,
    status: (mutation.data?.status as MemberLookupStatus | undefined) ?? null,
    error: mutation.error as unknown
  };
}
