import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  List,
  ListItem,
  Stack,
  Typography
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import MainCard from 'ui-component/cards/MainCard';
import { storefrontAPI } from 'api/storefront.api';
import type { StorefrontChecklist } from 'types/storefront';
import { storefrontError, useStorefront } from '../shared/useStorefront';

const checks: { key: keyof StorefrontChecklist; label: string; to: string }[] = [
  { key: 'homepage_sections', label: 'Add content to your homepage', to: '/storefront/builder' },
  { key: 'published_products', label: 'Publish at least one product', to: '/storefront/products' },
  { key: 'product_images', label: 'Add a product image', to: '/storefront/products' },
  { key: 'payments_connected', label: 'Connect payments', to: '/settings/payments/onboarding' },
  { key: 'domain_active', label: 'Activate a domain', to: '/storefront/domains' },
  { key: 'policies_written', label: 'Write your store policies', to: '/storefront/settings' },
  { key: 'shipping_configured', label: 'Configure shipping or pickup', to: '/storefront/settings' }
];
type Action = { kind: 'publish' } | { kind: 'discard' } | { kind: 'restore'; id: string; number: number };

export default function StorefrontOverview() {
  const { site, key, enabled, refresh } = useStorefront();
  const checklist = useQuery({ queryKey: [...key, 'checklist'], queryFn: storefrontAPI.getChecklist, enabled });
  const pages = useQuery({ queryKey: [...key, 'pages'], queryFn: storefrontAPI.getPages, enabled });
  const versions = useQuery({ queryKey: [...key, 'versions'], queryFn: storefrontAPI.getVersions, enabled });
  const domains = useQuery({ queryKey: [...key, 'domains'], queryFn: storefrontAPI.getDomains, enabled });
  const [action, setAction] = useState<Action | null>(null);
  const [notice, setNotice] = useState('');
  const mutation = useMutation({
    mutationFn: async (value: Action) => {
      if (value.kind === 'publish') await storefrontAPI.publish();
      else if (value.kind === 'discard') await storefrontAPI.discardDraft();
      else await storefrontAPI.restoreVersion(value.id);
    },
    onSuccess: async (_, value) => {
      setAction(null);
      setNotice(
        value.kind === 'publish' ? 'Your store has been published.' : 'Draft restored. Review the preview, then publish when ready.'
      );
      await refresh();
    }
  });
  const comingSoon = useMutation({
    mutationFn: () => storefrontAPI.updateSite({ status: 'coming_soon', draft_revision: site.data!.draft_revision }),
    onSettled: refresh
  });
  const preview = useMutation({ mutationFn: storefrontAPI.getPreviewLink });
  const primary = domains.data?.find((domain) => domain.is_primary && domain.status === 'active');
  const latest = versions.data?.[0];
  const pageCount = pages.data?.filter((page) => page.is_visible).length ?? 0;
  const productCount = checklist.data?.published_products.count ?? 0;
  const error = site.error || checklist.error || pages.error || versions.error || domains.error || comingSoon.error || preview.error;
  const summaryReady = pages.isSuccess && checklist.isSuccess && versions.isSuccess;
  return (
    <Stack spacing={3}>
      <MainCard title="Online Storefront">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {storefrontError(error)}
          </Alert>
        )}
        {notice && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
            {notice}
          </Alert>
        )}
        {site.isPending && <Typography>Loading your store…</Typography>}
        {site.data && (
          <Stack spacing={2} alignItems="flex-start">
            <Chip label={site.data.status.replace('_', ' ')} color={site.data.status === 'live' ? 'success' : 'default'} />
            <Typography sx={{ overflowWrap: 'anywhere' }}>{primary?.host ?? `${site.data.subdomain}.allyvia.shop`}</Typography>
            <Typography variant="body2">
              {site.data.status === 'draft'
                ? 'Your store is private until you publish or enable the coming soon page.'
                : site.data.status === 'coming_soon'
                  ? 'Visitors see your branded coming soon page.'
                  : 'Visitors see your latest published version. Draft edits stay private until you publish again.'}
            </Typography>
            <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
              {primary && site.data.status !== 'draft' && (
                <Button component="a" href={`https://${primary.host}`} target="_blank" rel="noopener noreferrer">
                  View store
                </Button>
              )}
              <Button onClick={() => preview.mutate()} disabled={preview.isPending}>
                Preview draft
              </Button>
              {preview.data && (
                <Button component="a" href={preview.data.url} target="_blank" rel="noopener noreferrer">
                  Open preview (valid for 15 minutes)
                </Button>
              )}
              {site.data.status === 'draft' && (
                <Button onClick={() => comingSoon.mutate()} disabled={comingSoon.isPending}>
                  Enable coming soon page
                </Button>
              )}
            </Stack>
            {summaryReady && (
              <Typography>
                {pageCount} pages · {productCount} products ·{' '}
                {latest ? `last published ${formatDistanceToNow(new Date(latest.created_at), { addSuffix: true })}` : 'never published'}
              </Typography>
            )}
            {latest && summaryReady && (
              <Typography variant="body2" color="text.secondary">
                Previous version: {latest.snapshot.pages.length} pages, {latest.snapshot.products.length} products. Publishing includes all
                current draft changes.
              </Typography>
            )}
            <Stack direction="row" gap={1}>
              <Button
                variant="contained"
                disabled={!summaryReady || mutation.isPending}
                onClick={() => {
                  mutation.reset();
                  setAction({ kind: 'publish' });
                }}
              >
                Publish
              </Button>
              <Button
                disabled={!latest || mutation.isPending}
                onClick={() => {
                  mutation.reset();
                  setAction({ kind: 'discard' });
                }}
              >
                Discard draft changes
              </Button>
            </Stack>
          </Stack>
        )}
      </MainCard>
      <MainCard title="Ready to launch">
        {checklist.isPending && <Typography>Loading checklist…</Typography>}
        <List disablePadding>
          {checks.map((check) => (
            <ListItem key={check.key} disableGutters>
              <Checkbox
                checked={checklist.data?.[check.key].complete ?? false}
                readOnly
                tabIndex={-1}
                inputProps={{ 'aria-label': check.label }}
              />
              <Link component={RouterLink} to={check.to}>
                {check.label}
              </Link>
              {checklist.data && (
                <Typography sx={{ ml: 1 }} color="text.secondary">
                  ({checklist.data[check.key].count})
                </Typography>
              )}
            </ListItem>
          ))}
        </List>
      </MainCard>
      <MainCard title="Published versions">
        {versions.isSuccess && !versions.data.length && <Typography>No published versions yet.</Typography>}
        <Stack spacing={2}>
          {versions.data?.map((version) => (
            <Stack key={version.id} spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                <Typography>
                  Version {version.number} · {new Date(version.created_at).toLocaleString()}
                </Typography>
                <Button
                  disabled={mutation.isPending}
                  onClick={() => {
                    mutation.reset();
                    setAction({ kind: 'restore', id: version.id, number: version.number });
                  }}
                >
                  Restore to draft
                </Button>
              </Stack>
              <Divider />
            </Stack>
          ))}
        </Stack>
      </MainCard>
      <Dialog open={!!action} onClose={() => !mutation.isPending && setAction(null)}>
        <DialogTitle>
          {action?.kind === 'publish'
            ? 'Publish your store?'
            : action?.kind === 'restore'
              ? `Restore version ${action.number}?`
              : 'Discard draft changes?'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {action?.kind === 'publish'
              ? `${pageCount} pages and ${productCount} products will become the published version of your store.`
              : 'This replaces your current draft pages, theme and settings. Your published store stays unchanged until you publish again.'}
          </Typography>
          {mutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {storefrontError(mutation.error)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={mutation.isPending} onClick={() => setAction(null)}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} onClick={() => action && mutation.mutate(action)}>
            {mutation.isPending ? 'Working…' : action?.kind === 'publish' ? 'Publish' : 'Restore draft'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
