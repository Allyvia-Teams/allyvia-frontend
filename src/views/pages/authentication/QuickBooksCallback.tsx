import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useEffect, useState, useMemo } from 'react';
import axiosServices from 'utils/axios';
import { fetcher } from 'utils/axios';
import { type Company, type QBAuthCallbackBody } from 'types/entities';

export const QuickBooksCallback = () => {
  const [qbBody, setBody] = useState<QBAuthCallbackBody | null>(null);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: () => fetcher('/company')
  });

  const parsedParams = useMemo(() => {
    const { searchParams } = new URL(window.location.href);
    const result: Partial<QBAuthCallbackBody> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === 'realmId') {
        result.realm_id = value;
      } else {
        result[key as keyof QBAuthCallbackBody] = value;
      }
    }
    return result;
  }, []);

  useEffect(() => {
    if (!isLoading && data && parsedParams.realm_id) {
      const match = data.find((d: Company) => d.qb_realm_id === parsedParams.realm_id);
      if (!match) return;

      const fullBody: QBAuthCallbackBody = {
        ...parsedParams,
        company_id: match.id
      } as QBAuthCallbackBody;

      setBody(fullBody);
    }
  }, [isLoading, data, parsedParams]);

  const { mutate } = useMutation({
    mutationKey: ['qb-callback'],
    mutationFn: () => axiosServices.post('/quickbooks/callback/', qbBody),
    onSuccess: () => navigate('/dashboard', { replace: true })
  });

  useEffect(() => {
    if (qbBody) {
      mutate();
    }
  }, [qbBody]);

  return <></>;
};
