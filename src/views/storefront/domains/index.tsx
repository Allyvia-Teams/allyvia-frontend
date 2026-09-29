import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { storefrontAPI } from 'api/storefront.api';
import type { StorefrontDomain } from 'types/storefront';
import { storefrontError, useStorefront } from '../shared/useStorefront';

type DomainAction = { kind: 'verify' | 'primary' | 'remove'; id: string };
export default function StorefrontDomains() {
  const { site, key, enabled, refresh } = useStorefront();
  const domains = useQuery({ queryKey: [...key, 'domains'], queryFn: storefrontAPI.getDomains, enabled, refetchInterval: 30000 });
  const [host, setHost] = useState('');
  const [slug, setSlug] = useState<string | null>(null);
  const [remove, setRemove] = useState<StorefrontDomain | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const add = useMutation({
    mutationFn: storefrontAPI.addDomain,
    onSuccess: async () => {
      setHost('');
      await refresh();
    }
  });
  const rename = useMutation({
    mutationFn: () => storefrontAPI.updateSite({ subdomain: slug ?? site.data!.subdomain, draft_revision: site.data!.draft_revision }),
    onSuccess: () => setSlug(null),
    onSettled: refresh
  });
  const action = useMutation({
    mutationFn: async ({ kind, id }: DomainAction) => {
      if (kind === 'verify') await storefrontAPI.verifyDomain(id);
      else if (kind === 'primary') await storefrontAPI.setPrimaryDomain(id);
      else await storefrontAPI.deleteDomain(id);
    },
    onSuccess: async () => {
      setRemove(null);
      await refresh();
    }
  });
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage('Copied to clipboard.');
    } catch {
      setCopyMessage('Copy failed. Select and copy the record below.');
    }
  };
  const error = site.error || domains.error || add.error || rename.error || action.error;
  return (
    <Stack spacing={3}>
      <MainCard title="Store domains">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {storefrontError(error)}
          </Alert>
        )}
        {copyMessage && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => setCopyMessage('')}>
            {copyMessage}
          </Alert>
        )}
        {site.isPending && <Typography>Loading domains…</Typography>}
        {site.data && (
          <Stack spacing={2}>
            <Typography>
              Your Allyvia subdomain stays available when you add a custom domain. Other active hosts redirect to your primary domain.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
              <TextField
                label="Allyvia subdomain"
                value={slug ?? site.data.subdomain}
                disabled={site.data.status === 'live' || rename.isPending}
                onChange={(event) => setSlug(event.target.value)}
                helperText={
                  site.data.status === 'live'
                    ? 'Subdomains cannot change after publishing.'
                    : 'Uses lowercase letters, numbers and hyphens.'
                }
              />
              <Typography>.allyvia.shop</Typography>
              {site.data.status !== 'live' && (
                <Button disabled={!slug || slug === site.data.subdomain || rename.isPending} onClick={() => rename.mutate()}>
                  Save subdomain
                </Button>
              )}
            </Stack>
          </Stack>
        )}
      </MainCard>
      {domains.data?.map((domain) => (
        <MainCard key={domain.id}>
          <Stack spacing={2}>
            <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} alignItems="center">
              <Typography variant="h4" sx={{ overflowWrap: 'anywhere' }}>
                {domain.host}
              </Typography>
              <Chip label={domain.status.replace('_', ' ')} color={domain.status === 'active' ? 'success' : 'default'} size="small" />
              {domain.is_primary && <Chip label="Primary" size="small" />}
            </Stack>
            {domain.cert_state === 'local' && (
              <Typography variant="body2">Local development certificate mode; HTTPS has not been issued.</Typography>
            )}
            {domain.last_error && (
              <Alert severity="warning" sx={{ overflowWrap: 'anywhere' }}>
                {domain.last_error}
              </Alert>
            )}
            {domain.kind === 'custom' && (
              <>
                <Typography variant="body2">
                  Add these records with your DNS provider. DNS and certificate checks continue automatically every 10 minutes after
                  deployment.
                </Typography>
                {[
                  ...domain.dns_target
                    .split(',')
                    .map((value) => ({ type: /^\d+\.\d+\.\d+\.\d+$/.test(value) ? 'A' : 'CNAME', name: domain.host, value })),
                  { type: 'TXT', name: `_allyvia-verify.${domain.host}`, value: domain.verification_token }
                ].map((record) => (
                  <Stack
                    key={`${record.type}-${record.value}`}
                    direction={{ xs: 'column', sm: 'row' }}
                    gap={1}
                    sx={{ bgcolor: 'background.default', p: 1.5, borderRadius: 1 }}
                  >
                    <Typography sx={{ minWidth: 55 }}>{record.type}</Typography>
                    <Typography sx={{ flex: 1, overflowWrap: 'anywhere' }}>{record.name}</Typography>
                    <Typography sx={{ flex: 1, overflowWrap: 'anywhere', userSelect: 'all' }}>{record.value}</Typography>
                    <Button onClick={() => copy(record.value)} aria-label={`Copy ${record.type} value for ${record.name}`}>
                      Copy value
                    </Button>
                  </Stack>
                ))}
              </>
            )}
            {domain.last_checked_at && (
              <Typography variant="caption">
                Last checked {new Date(domain.last_checked_at).toLocaleString()} · Certificate: {domain.cert_state}
              </Typography>
            )}
            <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
              {domain.kind === 'custom' && domain.status !== 'active' && (
                <Button disabled={action.isPending} onClick={() => action.mutate({ kind: 'verify', id: domain.id })}>
                  Verify DNS
                </Button>
              )}
              {!domain.is_primary && domain.status === 'active' && (
                <Button disabled={action.isPending} onClick={() => action.mutate({ kind: 'primary', id: domain.id })}>
                  Make primary
                </Button>
              )}
              {domain.kind === 'custom' && (
                <Button
                  color="error"
                  disabled={action.isPending}
                  onClick={() => {
                    action.reset();
                    setRemove(domain);
                  }}
                >
                  Remove
                </Button>
              )}
            </Stack>
          </Stack>
        </MainCard>
      ))}
      <MainCard title="Add a custom domain">
        <Stack
          component="form"
          spacing={2}
          onSubmit={(event) => {
            event.preventDefault();
            if (host.trim()) add.mutate(host.trim());
          }}
        >
          <TextField
            label="Domain name"
            placeholder="shop.example.com"
            value={host}
            onChange={(event) => setHost(event.target.value)}
            disabled={add.isPending}
            required
          />
          <Button type="submit" variant="contained" disabled={!enabled || !host.trim() || add.isPending}>
            {add.isPending ? 'Preparing DNS records…' : 'Get DNS instructions'}
          </Button>
        </Stack>
      </MainCard>
      <Dialog open={!!remove} onClose={() => !action.isPending && setRemove(null)}>
        <DialogTitle>Remove domain?</DialogTitle>
        <DialogContent>
          <Typography>{remove?.host} will stop serving your store. If it is primary, another active domain becomes primary.</Typography>
          {action.error && <Alert severity="error">{storefrontError(action.error)}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button disabled={action.isPending} onClick={() => setRemove(null)}>
            Cancel
          </Button>
          <Button color="error" disabled={action.isPending} onClick={() => remove && action.mutate({ kind: 'remove', id: remove.id })}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
