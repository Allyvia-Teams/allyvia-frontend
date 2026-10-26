// The share link's page (design §10, B8): the shared projection of a memo, read-only. No chat, no decisions, no
// See the numbers, no actions; nothing the owner's memo carries beyond the projection (no cash, posture,
// costs, notes or customer counts). Public: the token in the path is the only key.

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';

import { getSharedMemo } from 'api/buying.api';

import { serverSentence } from '../errors';
import { sharedMemoView } from '../sharedMemo';
import Memo from './Memo';

const API_BASE: string = import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api/v1/';

export default function SharedPlan() {
  const { token = '' } = useParams();
  const query = useQuery({
    queryKey: ['buy-shared-memo', token],
    queryFn: () => getSharedMemo(token),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', px: 2, py: 4 }}>
      {query.isLoading ? <Skeleton variant="rounded" height={480} /> : null}
      {query.isError ? <Alert severity="info">{serverSentence(query.error, 'This link does not work any more.')}</Alert> : null}
      {query.data ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button
              size="small"
              variant="outlined"
              href={`${API_BASE.replace(/\/+$/, '')}/buy/shared/${encodeURIComponent(token)}/memo.pdf`}
            >
              PDF
            </Button>
          </Box>
          <Memo view={sharedMemoView(query.data, API_BASE)} showAll />
        </>
      ) : null}
    </Box>
  );
}
