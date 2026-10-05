import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'store';
import bankingApi from 'api/banking';

export function useFinancialSource() {
  const role = useSelector((state) => state.auth.currentRole);
  return useQuery({
    queryKey: ['banking', 'source', role?.company_id, role?.id],
    queryFn: bankingApi.source,
    enabled: !!role?.company_id,
    staleTime: 0,
    retry: false
  });
}
