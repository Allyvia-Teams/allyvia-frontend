// Feeds the header's sync indicator, which is about first imports only (see
// views/pos-integrations/globalSync.ts for the rules).
//
// Loading: on mount it reads the QuickBooks and Square connections itself, then
// each one's import job once it is known to be connected, so the chip works
// after a reload on any page. Those thunks share an in-flight request with any
// page that asks at the same moment, so a reload does not double-fetch. POS
// connections and the bank come from react-query, with focus and reconnect
// refetches off.
//
// Polling: the same hand-rolled window.setInterval as useSyncPolling, every 5
// seconds, and only while a first import is running. It rereads only the
// sources that are importing. With none running it makes no requests at all.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import bankingApi from 'api/banking';
import bankConnectionsApi from 'api/bankConnections';
import { listConnections, startRun } from 'api/posIntegrations.api';
import { useDispatch, useSelector } from 'store';
import {
  fetchQBConnectionStatus,
  fetchQBImportStatus,
  fetchSquareConnectionStatus,
  fetchSquareImportStatus,
  triggerQBImport,
  triggerSquareImport
} from 'store/slices/integrations';
import { errorMessage, keys, snack, SYNC_POLL_MS } from 'views/pos-integrations/hooks/usePosIntegrations';
import type { IntegrationSync, SyncState } from 'views/pos-integrations/globalSync';
import {
  bankConnectedAt,
  finishedImports,
  finishedMessage,
  globalSync,
  isAnyImporting,
  stateByKey,
  visibleIntegrations
} from 'views/pos-integrations/globalSync';

const CONNECTED = ['connected', 'refreshing', 'expired'];

// Read on mount and when told to, never on their own.
const QUIET = { retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false, staleTime: Infinity } as const;

/** Runs `load` once per company, however often the effect re-runs (StrictMode included). */
function useOncePerCompany(companyId: string | null, ready: boolean, load: (companyId: string) => void) {
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!companyId || !ready || loadedFor.current === companyId) return;
    loadedFor.current = companyId;
    load(companyId);
  }, [companyId, ready, load]);
}

export function useGlobalSync() {
  const dispatch = useDispatch();
  const client = useQueryClient();
  const navigate = useNavigate();

  const role = useSelector((state) => state.auth.currentRole);
  const companyId = role?.company_id ?? null;
  const { quickbooks, square } = useSelector((state) => state.integrations);
  const qbConnected = CONNECTED.includes(quickbooks.connection.status);
  const squareConnected = CONNECTED.includes(square.connection.status);

  const loadConnections = useCallback(
    (id: string) => {
      dispatch(fetchQBConnectionStatus(id));
      dispatch(fetchSquareConnectionStatus(id));
    },
    [dispatch]
  );
  const loadQbJob = useCallback((id: string) => dispatch(fetchQBImportStatus(id)), [dispatch]);
  const loadSquareJob = useCallback((id: string) => dispatch(fetchSquareImportStatus(id)), [dispatch]);
  useOncePerCompany(companyId, true, loadConnections);
  useOncePerCompany(companyId, qbConnected, loadQbJob);
  useOncePerCompany(companyId, squareConnected, loadSquareJob);

  // Same keys as the POS screens and useFinancialSource, so they share one cache.
  const pos = useQuery({ queryKey: keys.connections, queryFn: listConnections, enabled: !!companyId, ...QUIET });
  const bank = useQuery({
    queryKey: ['banking', 'source', companyId, role?.id],
    queryFn: bankingApi.source,
    enabled: !!companyId,
    ...QUIET
  });

  // /banking/source/ does not say when the bank was connected; the Stripe
  // accounts list does. Asked once, and only while a first scan could be running.
  const bankConnection = bank.data?.connection;
  const firstScanPending = bank.data?.provider === 'stripe' && !!bankConnection && !bankConnection.last_synced_at;
  const bankAccounts = useQuery({
    queryKey: ['bank-connections', 'list', companyId],
    queryFn: bankConnectionsApi.list,
    enabled: firstScanPending,
    ...QUIET
  });

  // The bank's 30-minute cutoff depends on the clock, so the poll moves it on.
  const [now, setNow] = useState(() => new Date());

  const all = useMemo(
    () =>
      globalSync({
        qbImportJob: quickbooks.importJob,
        qbConnected,
        squareImportJob: square.importJob,
        squareConnected,
        posConnections: pos.data,
        bankSource: bank.data,
        bankConnectedAt: bankConnectedAt(bankAccounts.data),
        now
      }),
    [quickbooks.importJob, qbConnected, square.importJob, squareConnected, pos.data, bank.data, bankAccounts.data, now]
  );
  const items = useMemo(() => visibleIntegrations(all), [all]);
  const importing = isAnyImporting(all);

  // Which sources to reread, as one string so the interval below is rebuilt
  // only when that set changes, not on every reading.
  const pollKey = all
    .filter((item) => item.state === 'importing')
    .map((item) => (item.key.startsWith('pos:') ? 'pos' : item.key))
    .filter((key, index, list) => list.indexOf(key) === index)
    .sort()
    .join(',');

  useEffect(() => {
    if (!importing || !companyId) return undefined;
    const sources = pollKey.split(',');
    const timer = window.setInterval(() => {
      if (sources.includes('quickbooks')) dispatch(fetchQBImportStatus(companyId));
      if (sources.includes('square')) dispatch(fetchSquareImportStatus(companyId));
      if (sources.includes('pos')) client.invalidateQueries({ queryKey: keys.connections });
      if (sources.includes('bank')) client.invalidateQueries({ queryKey: ['banking', 'source'] });
      setNow(new Date());
    }, SYNC_POLL_MS);
    return () => window.clearInterval(timer);
  }, [client, companyId, dispatch, importing, pollKey]);

  // One success message per finished first import, on that transition only.
  // The first reading records state without a message.
  const previous = useRef<Record<string, SyncState>>({});
  useEffect(() => {
    const finished = finishedImports(previous.current, all);
    finished.forEach((item) => snack(finishedMessage(item), 'success'));
    if (finished.some((item) => item.key.startsWith('pos:'))) {
      // What the import wrote: runs, the providers list, store mappings.
      client.invalidateQueries({ queryKey: ['pos-integrations'] });
    }
    previous.current = stateByKey(all);
  }, [client, all]);

  const [retrying, setRetrying] = useState<string | null>(null);

  const retry = useCallback(
    async (item: IntegrationSync) => {
      const action = item.retry;
      if (!action) return;
      if (action.kind === 'open') {
        navigate(action.path);
        return;
      }
      if (!companyId) return;
      setRetrying(item.key);
      try {
        if (action.kind === 'import_job') {
          const trigger = action.source === 'quickbooks' ? triggerQBImport : triggerSquareImport;
          await dispatch(trigger(companyId)).unwrap();
        } else {
          await startRun(action.connectionId);
          client.invalidateQueries({ queryKey: keys.connections });
          client.invalidateQueries({ queryKey: keys.connection(action.connectionId) });
        }
        snack(`Importing from ${item.label} again.`, 'info');
      } catch (error) {
        // The import thunks reject with the backend's message as a string.
        const message = typeof error === 'string' ? error : errorMessage(error, `Could not retry ${item.label}.`);
        snack(message, 'error');
      } finally {
        setRetrying(null);
      }
    },
    [client, companyId, dispatch, navigate]
  );

  return { items, importing, retry, retrying };
}
