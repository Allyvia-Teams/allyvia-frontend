import useSWR from 'swr';
import axiosServices from 'utils/axios';
import { useSelector } from 'store';
import { healthQueryKey, visibleHealth, matchesHealthIdentity, type HealthResponse } from '../health/buildHealthView';

export function useHealth() {
  const { user, currentRole } = useSelector((state) => state.auth);
  const key =
    user?.id && currentRole?.company_id && currentRole.id ? healthQueryKey(user.id, currentRole.company_id, currentRole.id) : null;
  const result = useSWR(
    key,
    async (requestKey) => {
      const { data } = await axiosServices.get<HealthResponse>('agent/health/');
      if (!matchesHealthIdentity(data, requestKey[2], requestKey[3])) throw new Error('Health response scope changed during request');
      return data;
    },
    { keepPreviousData: false, refreshInterval: 60000, revalidateOnFocus: true, shouldRetryOnError: false }
  );
  // Errors (including off/404) suppress cached data, and a changed role starts empty.
  return { view: visibleHealth(result.data, Boolean(key), result.isLoading, result.error), identity: key?.join(':') };
}
