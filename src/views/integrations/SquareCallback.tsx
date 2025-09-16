import React, { useEffect, useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import axiosServices from 'utils/axios';
import { fetcher } from 'utils/axios';
import { type Company, type SquareAuthCallbackBody } from 'types/entities';
import { processSquareCallback } from 'store/slices/integrations';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

export const SquareCallback: React.FC = () => {
  const [squareBody, setBody] = useState<SquareAuthCallbackBody | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { data, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: () => fetcher('/company')
  });

  const parsedParams = useMemo(() => {
    const { searchParams } = new URL(window.location.href);
    const result: Partial<SquareAuthCallbackBody> = {};
    for (const [key, value] of searchParams.entries()) {
      result[key as keyof SquareAuthCallbackBody] = value;
    }
    return result;
  }, []);

  useEffect(() => {
    if (!isLoading && data && parsedParams.code && parsedParams.state) {
      // For Square, we need to find the company by the current user's company
      // Since Square doesn't use realm_id like QuickBooks, we'll use the first company
      const company = data.find((d: Company) => d.id);
      if (!company) return;

      const fullBody: SquareAuthCallbackBody = {
        ...parsedParams,
        company_id: company.id
      } as SquareAuthCallbackBody;

      setBody(fullBody);
    }
  }, [isLoading, data, parsedParams]);

  const { mutate, isPending, error } = useMutation({
    mutationKey: ['square-callback'],
    mutationFn: (body: SquareAuthCallbackBody) => axiosServices.post('/integrations/square/callback/', body),
    onSuccess: (response) => {
      // Dispatch the success action to update Redux state
      dispatch(processSquareCallback.fulfilled(response.data, '', squareBody!));
      navigate('/integrations/square', { replace: true });
    },
    onError: (error: any) => {
      console.error('Square callback error:', error);
    }
  });

  useEffect(() => {
    if (squareBody) {
      mutate(squareBody);
    }
  }, [squareBody, mutate]);

  if (isLoading || isPending) {
    return (
      <MainCard title="Square Integration">
        <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
          <CircularProgress size={40} />
          <Typography variant="h6">Processing Square connection...</Typography>
          <Typography variant="body2" color="textSecondary">
            Please wait while we complete your Square integration setup.
          </Typography>
        </Box>
      </MainCard>
    );
  }

  if (error) {
    return (
      <MainCard title="Square Integration">
        <Box py={4}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">Connection Failed</Typography>
            <Typography variant="body2">
              {error.response?.data?.message || 'An error occurred while connecting to Square. Please try again.'}
            </Typography>
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => navigate('/integrations/square')}
          >
            Back to Square Integration
          </Button>
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard title="Square Integration">
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
        <CircularProgress size={40} />
        <Typography variant="h6">Completing Square connection...</Typography>
      </Box>
    </MainCard>
  );
};
