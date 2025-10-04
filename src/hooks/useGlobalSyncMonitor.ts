import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'store';
import { useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useTheme } from '@mui/material/styles';
import { fetchAllSyncStatus } from 'store/slices/syncProgress';

export const useGlobalSyncMonitor = (companyId: string | null, isConnected: boolean) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const theme = useTheme();

  const { statuses, isAnySyncing } = useSelector((state) => state.syncProgress);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevStatusesRef = useRef<any>({});

  useEffect(() => {
    if (!companyId || !isConnected || !isAnySyncing) return;

    const poll = async () => {
      await dispatch(fetchAllSyncStatus(companyId));
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [companyId, isConnected, isAnySyncing, dispatch]);

  useEffect(() => {
    if (!companyId || !isConnected || isAnySyncing) return;

    const check = async () => {
      await dispatch(fetchAllSyncStatus(companyId));
    };

    checkIntervalRef.current = setInterval(check, 30000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [companyId, isConnected, isAnySyncing, dispatch]);

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
