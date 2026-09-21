import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { storefrontAPI } from 'api/storefront.api';
import { useSelector } from 'store';

export function useStorefront() {
  const roleId = useSelector((state) => state.auth.currentRole?.id);
  const client = useQueryClient();
  const key = ['storefront', roleId];
  const site = useQuery({ queryKey: [...key, 'site'], queryFn: storefrontAPI.getSite, enabled: !!roleId });
  return { site, key, enabled: !!roleId && !!site.data, refresh: () => client.invalidateQueries({ queryKey: key }) };
}

export function storefrontError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 409) return 'Someone changed this draft. Review the latest state before trying again.';
    const data: unknown = error.response?.data;
    if (data && typeof data === 'object') {
      return Object.entries(data)
        .map(([key, value]) => `${key === 'detail' ? '' : `${key}: `}${typeof value === 'string' ? value : JSON.stringify(value)}`)
        .join(' ');
    }
  }
  return 'The request could not be completed. Please try again.';
}
