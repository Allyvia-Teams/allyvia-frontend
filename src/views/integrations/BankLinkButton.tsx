import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'store';
import bankingApi from 'api/banking';
import { readPlaidSession, type PlaidSession } from './plaidSession';

interface LinkHandler {
  open: () => void;
  destroy: () => void;
}
interface PlaidSdk {
  create: (options: {
    token: string;
    receivedRedirectUri?: string;
    onSuccess: (token: string) => void;
    onExit: (error: unknown) => void;
  }) => LinkHandler;
}
declare global {
  interface Window {
    Plaid?: PlaidSdk;
  }
}

let sdkPromise: Promise<PlaidSdk> | undefined;
const STORAGE_KEY = 'allyvia-plaid-link';

function loadPlaid(): Promise<PlaidSdk> {
  if (window.Plaid) return Promise.resolve(window.Plaid);
  if (!sdkPromise) {
    sdkPromise = new Promise<PlaidSdk>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      script.async = true;
      script.onload = () => (window.Plaid ? resolve(window.Plaid) : reject(new Error('Bank connection could not load.')));
      script.onerror = () => {
        script.remove();
        reject(new Error('Bank connection could not load. Please retry.'));
      };
      document.head.appendChild(script);
    }).catch((error) => {
      sdkPromise = undefined;
      throw error;
    });
  }
  return sdkPromise;
}

export default function BankLinkButton({ connectionId, disabled = false }: { connectionId?: string; disabled?: boolean }) {
  const role = useSelector((state) => state.auth.currentRole);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const handler = useRef<LinkHandler | null>(null);
  const resumed = useRef(false);

  const openSession = async (session: PlaidSession, redirect?: string) => {
    const plaid = await loadPlaid();
    handler.current?.destroy();
    const clearSession = () => {
      sessionStorage.removeItem(STORAGE_KEY);
      if (window.location.search.includes('oauth_state_id=')) window.history.replaceState(null, '', window.location.pathname);
    };
    handler.current = plaid.create({
      token: session.linkToken,
      ...(redirect ? { receivedRedirectUri: redirect } : {}),
      onSuccess: async (publicToken) => {
        try {
          const result = await bankingApi.exchange(session.sessionId, publicToken);
          clearSession();
          setNotice(
            result.sync_queued ? 'Bank connected. Transactions are importing.' : 'Bank connected. Use Scan now to retry the import.'
          );
          await qc.invalidateQueries({ queryKey: ['banking'] });
        } catch {
          setError('Could not finish connecting the bank. Please start the connection again.');
        } finally {
          setBusy(false);
        }
      },
      onExit: (linkError) => {
        clearSession();
        setBusy(false);
        if (linkError) setError('Bank authorization did not finish. Please try again.');
      }
    });
    handler.current.open();
  };

  useEffect(() => {
    if (!role?.company_id || !role.id || resumed.current || !window.location.search.includes('oauth_state_id=')) return;
    resumed.current = true;
    const session = readPlaidSession(sessionStorage.getItem(STORAGE_KEY), role.company_id, role.id);
    if (!session) {
      setError('This bank session expired or belongs to a different business. Start a new connection.');
      return;
    }
    setBusy(true);
    void openSession(session, window.location.href).catch(() => {
      setBusy(false);
      setError('Could not resume bank authorization. Please retry.');
    });
    // The saved OAuth session is resumed once per mounted return page.
  }, [role?.company_id, role?.id]);

  useEffect(() => () => handler.current?.destroy(), []);

  const connect = async () => {
    if (!role?.company_id || !role.id) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = await bankingApi.linkToken(connectionId);
      const session: PlaidSession = {
        companyId: role.company_id,
        roleId: role.id,
        linkToken: data.link_token,
        sessionId: data.session_id,
        expiresAt: Date.now() + (connectionId ? 30 : 240) * 60_000
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      await openSession(session);
    } catch {
      setBusy(false);
      setError('Could not open the bank connection. Please retry.');
    }
  };

  return (
    <Stack spacing={1} alignItems="flex-start">
      <Button variant="contained" disabled={disabled || busy} onClick={connect}>
        {busy ? 'Connecting…' : connectionId ? 'Reconnect bank' : 'Connect bank'}
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="info">{notice}</Alert>}
    </Stack>
  );
}
