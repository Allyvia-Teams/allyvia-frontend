import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'store';
import { useLocation } from 'react-router-dom';
import { initializeSyncFromCallback, setWaitingForOverviewData } from 'store/slices/syncProgress';
import { fetchOverview } from 'store/slices/qbEntities';
import { setMappingsLoaded } from 'store/slices/integrations';
import { getCompanyId } from 'utils/authStorage';
import qbApi from 'api/qb';

export const useSyncProgress = (companyId: string | null) => {
  const dispatch = useDispatch();
  const location = useLocation();

  const { statuses, isAnySyncing, currentEntity, isWaitingForOverviewData, completedCount, totalEntities } = useSelector(
    (state) => state.syncProgress
  );

  const isOnIntegrationPage = location.pathname.includes('/integrations/quickbooks');
  const overviewPollRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!companyId || !isOnIntegrationPage || hasInitialized.current) return;

    const state = location.state as any;
    if (state?.syncInitiated && state?.entities?.length > 0) {
      dispatch(initializeSyncFromCallback(state.entities));
      hasInitialized.current = true;
      dispatch(setWaitingForOverviewData(true));
      window.history.replaceState({}, document.title);
    }
  }, [companyId, isOnIntegrationPage, dispatch, location.state]);

  // Poll overview until real data arrives
  useEffect(() => {
    if (!isWaitingForOverviewData || !companyId) return;

    const hasRealData = (data: any) => {
      if (!data?.entities) return false;

      const expectedEntities = [
        'invoices',
        'payments',
        'customers',
        'vendors',
        'bills',
        'items',
        'accounts',
        'billpayments',
        'purchases',
        'vendorcredits'
      ];

      for (const entityKey of expectedEntities) {
        const entity = data.entities[entityKey];
        if (!entity) return false;
      }

      return true;
    };

    const pollOverview = async () => {
      const currentCompanyId = getCompanyId();
      if (!currentCompanyId) return;

      const result = await dispatch(fetchOverview(currentCompanyId));

      if (result.payload && hasRealData(result.payload)) {
        dispatch(setWaitingForOverviewData(false));
        if (overviewPollRef.current) {
          clearInterval(overviewPollRef.current);
          overviewPollRef.current = null;
        }

        // Load account mappings now that sync is complete
        if (currentCompanyId && result.payload?.entities?.accounts?.total > 0) {
          qbApi
            .getAccountMappings(currentCompanyId)
            .then((mappings) => {
              if (mappings && mappings.length > 0) {
                dispatch(setMappingsLoaded(mappings));
              }
            })
            .catch((error) => {
              console.error('Failed to load account mappings after sync:', error);
            });
        }
      }
    };

    pollOverview();
    overviewPollRef.current = setInterval(pollOverview, 2000);

    return () => {
      if (overviewPollRef.current) {
        clearInterval(overviewPollRef.current);
        overviewPollRef.current = null;
      }
    };
  }, [isWaitingForOverviewData, companyId, dispatch]);

  return {
    syncStatuses: statuses,
    isAnySyncing,
    currentEntity,
    completedCount,
    totalEntities
  };
};
