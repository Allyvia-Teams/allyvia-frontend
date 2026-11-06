import useSWR from 'swr';
import axiosServices from 'utils/axios';
import { useSelector } from 'store';
import { healthQueryKey, visibleHealth, matchesHealthIdentity, type HealthResponse } from '../health/buildHealthView';
import { buildCashContextView, cashContextFromResponse, cashContextKeyFor } from '../health/buildCashContextView';

/** The polled bar's read: never asks for the cash context. */
export async function fetchHealth(company: string, role: string) {
  const { data } = await axiosServices.get<HealthResponse>('agent/health/');
  if (!matchesHealthIdentity(data, company, role)) throw new Error('Health response scope changed during request');
  return data;
}

export function useHealth() {
  const { user, currentRole } = useSelector((state) => state.auth);
  const key =
    user?.id && currentRole?.company_id && currentRole.id ? healthQueryKey(user.id, currentRole.company_id, currentRole.id) : null;
  const result = useSWR(key, (requestKey) => fetchHealth(requestKey[2], requestKey[3]), {
    keepPreviousData: false,
    refreshInterval: 60000,
    revalidateOnFocus: true,
    shouldRetryOnError: false
  });
  // Errors (including off/404) suppress cached data, and a changed role starts empty.
  return { view: visibleHealth(result.data, Boolean(key), result.isLoading, result.error), identity: key?.join(':') };
}

export async function fetchCashContext(company: string, role: string) {
  const { data } = await axiosServices.get('agent/health/', { params: { include: 'cash_context' } });
  return cashContextFromResponse(data, company, role);
}

/**
 * The drawer's cash section. Building it reads the company's whole payable
 * record, so it is fetched only while the drawer is open, never by the polled bar.
 */
export function useHealthCashContext(enabled: boolean) {
  const { user, currentRole } = useSelector((state) => state.auth);
  const key = cashContextKeyFor(enabled, user?.id, currentRole?.company_id, currentRole?.id);
  const result = useSWR(key, (requestKey) => fetchCashContext(requestKey[2], requestKey[3]), {
    keepPreviousData: false,
    revalidateOnFocus: false,
    shouldRetryOnError: false
  });
  return {
    view: key && !result.isLoading && !result.error ? buildCashContextView(result.data) : null,
    loading: Boolean(key) && result.isLoading,
    failed: Boolean(result.error)
  };
}
