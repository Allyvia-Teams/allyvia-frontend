import { useState } from 'react';
import useSWR from 'swr';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { IconBuildingStore } from '@tabler/icons-react';

import { getCompanyTheme } from 'api/branding';
import { getCompanyBusinessInfo, updateCompanyBusinessInfo } from 'api/settings';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';
import type { CompanyBusinessInfo } from 'types/settings';

import SettingsSectionCard from './SettingsSectionCard';
import {
  buildMarketplacePreview,
  LISTED_NO_THEME_BODY,
  LISTED_NO_THEME_TITLE,
  MARKETPLACE_PRIVACY_NOTICE,
  MARKETPLACE_TOGGLE_DESCRIPTION,
  marketplaceVisibility,
  NOT_LISTED_NO_THEME_BODY,
  NOT_LISTED_NO_THEME_TITLE
} from './marketplacePreview';

interface MarketplaceListingProps {
  companyId: string;
}

/**
 * Publish this store to the Allyvia marketplace, and show what that publishes.
 *
 * THE WARNING IS THE FEATURE. The consumer directory requires a saved
 * CompanyTheme as well as the flag, so a merchant can switch listing on, see
 * it save, and never appear — with nothing anywhere explaining it. Both
 * themeless states are called out, including BEFORE the switch is flipped, so
 * nobody turns it on expecting to be found.
 *
 * The preview shows exactly the fields the entry carries and no others: a
 * preview that showed more would have merchants editing for an audience that
 * never sees it.
 */
export default function MarketplaceListing({ companyId }: MarketplaceListingProps) {
  const { data, isLoading, mutate } = useSWR(companyId ? `company-${companyId}` : null, () => getCompanyBusinessInfo(companyId));
  // The reliable themeless test: this endpoint returns literal null when no
  // theme row exists. The local brandTheme config cannot tell "no row on the
  // server" from "the app's default palette".
  const { data: theme, isLoading: themeLoading } = useSWR('company-theme', getCompanyTheme);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listed = !!data?.marketplace_listed;
  const visibility = marketplaceVisibility(listed, theme);
  const preview = buildMarketplacePreview(data, theme);

  const handleToggle = async () => {
    if (!data) return;
    const next = !listed;
    setSaving(true);
    setError(null);
    const optimistic: CompanyBusinessInfo = { ...data, marketplace_listed: next };
    try {
      await mutate(async () => updateCompanyBusinessInfo(companyId, { marketplace_listed: next }), {
        optimisticData: optimistic,
        rollbackOnError: true,
        revalidate: false
      });
      dispatch(
        openSnackbar({
          open: true,
          message: 'Marketplace listing updated.',
          variant: 'alert',
          alert: { color: 'success' },
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          close: true
        })
      );
    } catch (e: any) {
      const body = e?.response?.data;
      setError(body?.detail || body?.error || 'Failed to update marketplace listing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSectionCard
      title="Marketplace listing"
      description="Let Allyvia members discover your store and ask to join your Inner Circle."
      icon={<IconBuildingStore size={24} stroke={1.5} />}
    >
      {isLoading || themeLoading ? (
        <Skeleton variant="rounded" height={180} />
      ) : (
        <Stack spacing={2}>
          {error ? (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}

          <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                List this store in the Allyvia marketplace
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {MARKETPLACE_TOGGLE_DESCRIPTION}
              </Typography>
            </Box>
            <FormControlLabel
              control={<Switch checked={listed} onChange={handleToggle} disabled={saving || !data} />}
              label=""
              sx={{ mr: 0 }}
            />
          </Stack>

          {visibility === 'listed_no_theme' ? (
            <Alert severity="warning">
              <AlertTitle>{LISTED_NO_THEME_TITLE}</AlertTitle>
              {LISTED_NO_THEME_BODY}
            </Alert>
          ) : null}
          {visibility === 'not_listed_no_theme' ? (
            <Alert severity="info">
              <AlertTitle>{NOT_LISTED_NO_THEME_TITLE}</AlertTitle>
              {NOT_LISTED_NO_THEME_BODY}
            </Alert>
          ) : null}

          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Your marketplace entry
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
              {preview.logoUrl ? (
                <Box component="img" src={preview.logoUrl} alt="" sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'contain' }} />
              ) : (
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    No logo
                  </Typography>
                </Box>
              )}
              <Stack direction="row" spacing={1}>
                {[preview.primaryHex, preview.secondaryHex].map((hex, i) =>
                  hex ? (
                    <Box
                      key={hex}
                      sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: hex, border: '1px solid', borderColor: 'divider' }}
                    />
                  ) : (
                    <Typography key={`missing-${i}`} variant="caption" color="text.secondary">
                      No colour
                    </Typography>
                  )
                )}
              </Stack>
            </Stack>

            {preview.rows.map((row) => (
              <Stack key={row.label} direction="row" spacing={1} sx={{ mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
                  {row.label}
                </Typography>
                <Typography variant="body2" color={row.value ? 'text.primary' : 'text.secondary'}>
                  {row.value ?? 'Not set'}
                </Typography>
              </Stack>
            ))}

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
              {MARKETPLACE_PRIVACY_NOTICE}
            </Typography>
          </Box>
        </Stack>
      )}
    </SettingsSectionCard>
  );
}
