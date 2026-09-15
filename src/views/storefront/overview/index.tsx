import { useQuery } from '@tanstack/react-query';
import { Alert, Chip, Stack, Typography } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { storefrontAPI } from 'api/storefront.api';
import { useSelector } from 'store';

export default function StorefrontOverview() {
  const roleId = useSelector((state) => state.auth.currentRole?.id);
  const site = useQuery({ queryKey: ['storefront', roleId, 'site'], queryFn: storefrontAPI.getSite, enabled: !!roleId });
  return (
    <MainCard title="Online Storefront">
      {site.isPending && <Typography>Loading your store…</Typography>}
      {site.isError && <Alert severity="error">Could not load your store. Please try again.</Alert>}
      {site.data && (
        <Stack spacing={2} alignItems="flex-start">
          <Chip label={site.data.status.replace('_', ' ')} />
          <Typography>{site.data.subdomain}.allyvia.shop</Typography>
          <Typography>Your store is private while you prepare it. Website editing and publishing are coming soon.</Typography>
        </Stack>
      )}
    </MainCard>
  );
}
