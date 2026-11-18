import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import Typography from '@mui/material/Typography';

import { IconBrandInstagram } from '@tabler/icons-react';

import SocialAPI from 'api/social.api';
import SettingsSectionCard from 'ui-component/settings/SettingsSectionCard';

import { CARD_TITLE, DISCONNECT_CONFIRM, cardState, type CardState } from './socialEvents';
import { SOCIAL_CONNECTION_KEY, useSocialConnection } from './useSocialConnection';

const errorDetail = (error: unknown): string => {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : "Couldn't reach Instagram. Try again.";
};

export function InstagramCardView({
  state,
  busy,
  error,
  onConnect,
  onDisconnect
}: {
  state: CardState;
  busy?: boolean;
  error?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const [asking, setAsking] = useState(false);
  if (state.kind === 'hidden') return null;
  const line = state.kind === 'loading' ? 'Loading…' : state.kind === 'error' ? "Couldn't load your Instagram connection." : state.line;
  const action =
    state.kind === 'connect' || state.kind === 'reconnect' ? (
      <Button variant="outlined" size="small" onClick={onConnect} disabled={busy}>
        {state.button}
      </Button>
    ) : state.kind === 'connected' ? (
      <Button variant="text" size="small" color="inherit" onClick={() => setAsking(true)} disabled={busy}>
        {state.button}
      </Button>
    ) : undefined;
  return (
    <SettingsSectionCard
      title={CARD_TITLE}
      description="Your posts' sales and events, suggested for your calendar."
      icon={<IconBrandInstagram />}
      action={action}
    >
      <Typography variant="body2" color="text.secondary">
        {line}
      </Typography>
      {error ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      ) : null}
      <Dialog open={asking} onClose={() => setAsking(false)} aria-labelledby="instagram-disconnect">
        <DialogContent>
          <DialogContentText id="instagram-disconnect">{DISCONNECT_CONFIRM}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(false)}>Keep connected</Button>
          <Button
            color="error"
            onClick={() => {
              setAsking(false);
              onDisconnect();
            }}
          >
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </SettingsSectionCard>
  );
}

/** Settings > Integrations: connect the store's Instagram. Hidden while the server switch is off (404). */
export default function InstagramCard() {
  const client = useQueryClient();
  const connection = useSocialConnection();
  const connect = useMutation({
    mutationFn: SocialAPI.connect,
    onSuccess: ({ authorize_url }) => {
      window.location.assign(authorize_url);
    }
  });
  const disconnect = useMutation({
    mutationFn: SocialAPI.disconnect,
    onSuccess: (data) => client.setQueryData(SOCIAL_CONNECTION_KEY, data)
  });
  const state = cardState({ data: connection.data, status: connection.status, loading: connection.isLoading });
  const failed = connect.error ?? disconnect.error;
  return (
    <InstagramCardView
      state={state}
      busy={connect.isPending || disconnect.isPending}
      error={failed ? errorDetail(failed) : null}
      onConnect={() => connect.mutate()}
      onDisconnect={() => disconnect.mutate()}
    />
  );
}
