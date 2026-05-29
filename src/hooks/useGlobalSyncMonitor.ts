import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'store';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';
import { fetchAllSyncStatus } from 'store/slices/syncProgress';

export const useGlobalSyncMonitor = (companyId: string | null, isConnected: boolean) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const { statuses, isAnySyncing } = useSelector((state) => state.syncProgress);
  const prevStatusesRef = useRef<any>({});

  useEffect(() => {
    if (companyId && isConnected) {
      dispatch(fetchAllSyncStatus(companyId));
    }
  }, [dispatch, companyId, isConnected]);

  useEffect(() => {
    const wasAnySyncing = Object.values(prevStatusesRef.current).some((s: any) => s.status === 'in_progress' || s.status === 'queued');

    const hadRealSyncing = Object.values(prevStatusesRef.current).some((s: any) => s.status === 'in_progress' || s.status === 'queued');

    const isNowComplete = !isAnySyncing && Object.keys(statuses).length > 0;
    const justCompleted = wasAnySyncing && hadRealSyncing && isNowComplete;

    if (justCompleted) {
      enqueueSnackbar('QuickBooks sync complete! All entities are up-to-date', {
        variant: 'success',
        autoHideDuration: 5000,
        style: {
          backgroundColor: theme.palette.primary.main,
          color: 'white'
        }
      });
    }

    prevStatusesRef.current = statuses;
  }, [statuses, isAnySyncing, enqueueSnackbar, theme.palette.primary.main]);
};
