import { useQuery } from '@tanstack/react-query';

import SocialAPI from 'api/social.api';
import { errorStatus } from 'features/bankConnections/enabled';

/** One shared read of the Instagram connection. A 404 means switched off on this server, a 403 not her role. */
export const SOCIAL_CONNECTION_KEY = ['social-connection'] as const;
export const SOCIAL_PROPOSALS_KEY = ['social-proposals'] as const;

export function useSocialConnection(enabled = true) {
  const query = useQuery({ queryKey: SOCIAL_CONNECTION_KEY, queryFn: SocialAPI.connection, enabled, retry: false, staleTime: 60_000 });
  return { data: query.data, isLoading: query.isLoading, status: errorStatus(query.error) };
}
