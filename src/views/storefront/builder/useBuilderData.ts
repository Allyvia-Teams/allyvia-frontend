import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storefrontAPI } from 'api/storefront.api';
import type { UpdateSectionsPayload } from 'types/storefront';
import { useSelector } from 'store';

/**
 * Builder-owned data hook (T2). Lives under builder/ so we do not edit
 * T1's `views/storefront/shared/useStorefront.ts`.
 * Query keys align with shared useStorefront so site/pages cache is shared.
 */
export function useBuilderData() {
  const roleId = useSelector((state) => state.auth.currentRole?.id);
  const client = useQueryClient();
  const key = ['storefront', roleId] as const;
  const enabled = !!roleId;

  const site = useQuery({
    queryKey: [...key, 'site'],
    queryFn: storefrontAPI.getSite,
    enabled
  });

  const registry = useQuery({
    queryKey: [...key, 'registry'],
    queryFn: storefrontAPI.getRegistry,
    enabled
  });

  const pages = useQuery({
    queryKey: [...key, 'pages'],
    queryFn: storefrontAPI.getPages,
    enabled
  });

  const updateSections = useMutation({
    mutationFn: ({ pageId, data }: { pageId: string; data: UpdateSectionsPayload }) =>
      storefrontAPI.updateSections(pageId, data),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: key });
    }
  });

  return {
    site,
    registry,
    pages,
    updateSections,
    key,
    enabled: enabled && !!site.data,
    refresh: () => client.invalidateQueries({ queryKey: key })
  };
}
