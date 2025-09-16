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
    console.log('Parsed QB callback params:', result);
    console.log('Current URL:', window.location.href);
    return result;
  }, []);

  useEffect(() => {
    if (!isLoading && data && parsedParams.realm_id) {
      // First try to match by realm_id (for existing connections)
      let match = data.find((d: Company) => d.qb_realm_id === parsedParams.realm_id);

      // If no match by realm_id, this is a new connection - use stored company_id
      if (!match) {
        const storedCompanyId = localStorage.getItem('qb_connecting_company_id');
        if (storedCompanyId) {
          match = data.find((d: Company) => d.id === storedCompanyId);
          // Clean up stored company_id after use
          localStorage.removeItem('qb_connecting_company_id');
        }
      }

      if (!match) {
        console.error('Could not determine company for QuickBooks callback');
        navigate('/dashboard', { replace: true });
        return;
      }

      const fullBody: QBAuthCallbackBody = {
        ...parsedParams,
        company_id: match.id
      } as QBAuthCallbackBody;

      setBody(fullBody);
    }
  }, [isLoading, data, parsedParams]);

  const { mutate } = useMutation({
    mutationKey: ['qb-callback'],
    mutationFn: () => {
      console.log('Sending QB callback with body:', qbBody);
      return axiosServices.post('/quickbooks/callback/', qbBody);
    },
    onSuccess: () => navigate('/integrations/quickbooks', { replace: true }),
    onError: (error: any) => {
      console.error('QB callback error:', error);
      console.error('Error response:', error.response?.data);
    }
  });

  useEffect(() => {
    if (qbBody) {
      mutate();
    }
  }, [qbBody]);

  return <></>;
};
