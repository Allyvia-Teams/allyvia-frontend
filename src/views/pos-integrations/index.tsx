// Screen 1 — POS integrations home.
//
// One card per provider. A provider that is declared but has no connector yet
// shows "Coming soon" rather than a Connect button that would fail: an
// integrations page whose buttons sometimes error teaches merchants not to
// trust the page.

import { useNavigate } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import MainCard from 'ui-component/cards/MainCard';
import type { ProviderCard } from 'api/posIntegrations.api';
import { useProviders } from './hooks/usePosIntegrations';

const STATUS_CHIPS: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
  active: { label: 'Connected', color: 'success' },
  connecting: { label: 'Finishing setup', color: 'info' },
  needs_reauth: { label: 'Reconnect needed', color: 'error' },
  needs_attention: { label: 'Needs attention', color: 'warning' },
  disconnected: { label: 'Disconnected', color: 'default' },
  available: { label: 'Available', color: 'default' },
  coming_soon: { label: 'Coming soon', color: 'default' }
};

const DESCRIPTIONS: Record<string, string> = {
  csv: 'Import from a spreadsheet exported from any POS. Works with every system.',
  square: 'Bring your Square catalogue, customers and sales history across.',
  shopify: 'Import from Shopify and Shopify POS.',
  clover: 'Import your Clover inventory, customers and orders.',
  lightspeed: 'Import from Lightspeed Retail.'
};

function ProviderTile({ card }: { card: ProviderCard }) {
  const navigate = useNavigate();
  const chip = STATUS_CHIPS[card.status] ?? STATUS_CHIPS.available;
  const isConnected = !!card.connection_id && card.status !== 'disconnected';

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="h4">{card.label}</Typography>
            <Chip size="small" label={chip.label} color={chip.color} variant="outlined" />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {DESCRIPTIONS[card.provider] ?? ''}
          </Typography>
          {card.available && card.supports_ongoing_sync === false && (
            <Typography variant="caption" color="text.secondary">
              One-time import — a spreadsheet is a snapshot, not a live feed.
            </Typography>
          )}
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        {!card.available ? (
          <Button size="small" disabled>
            Coming soon
          </Button>
        ) : isConnected ? (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={() => navigate(`/integrations/pos/connections/${card.connection_id}`)}>
              Manage
            </Button>
            <Button size="small" onClick={() => navigate(`/integrations/pos/connect/${card.provider}`)}>
              Import again
            </Button>
          </Stack>
        ) : (
          <Button size="small" variant="contained" onClick={() => navigate(`/integrations/pos/connect/${card.provider}`)}>
            Connect
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

export default function PosIntegrationsHome() {
  const { data, isLoading, isError } = useProviders();

  return (
    <MainCard title="Bring your data across">
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Move your customers, catalogue, stock and sales history from your old point of sale into Allyvia. Nothing is imported until you’ve
          seen a summary and approved it.
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && <Alert severity="error">We couldn’t load the list of systems. Please refresh.</Alert>}

        {data && (
          <Grid container spacing={2}>
            {data.map((card) => (
              <Grid key={card.provider} size={{ xs: 12, sm: 6, md: 4 }}>
                <ProviderTile card={card} />
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>
    </MainCard>
  );
}
