// Inventory › Plan (design §10): the plans, one memo per store, and New plan. The store scope is the page's
// `?location_id=`, sent as `X-Location-Id`; the server says which scope it answered.

import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { createPlan, listPlans, type NewPlan } from 'api/buying.api';
import { listLocations } from 'api/inventoryStock.api';
import { PageHeader } from 'ui-component/frame';

import { fieldErrors, serverSentence } from '../errors';
import { canOfferAll, groupByStore, planHref, planStatusWord } from '../planListing';
import NewPlanDialog from './NewPlanDialog';

const day = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

export default function PlanList() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const locationId = params.get('location_id');
  const [creating, setCreating] = useState(false);
  // A fresh form each time it opens (the dialog stays mounted between openings).
  const [formKey, setFormKey] = useState(0);

  const plans = useQuery({ queryKey: ['buy-plans', locationId], queryFn: () => listPlans(locationId), retry: false });
  // The unscoped answer says whether this role sees every store (the server's word, never assumed).
  const unscoped = useQuery({ queryKey: ['buy-plans', null], queryFn: () => listPlans(null), retry: false, enabled: Boolean(locationId) });
  const companyView = (locationId ? unscoped.data : plans.data) ?? null;
  const offerAll = companyView ? canOfferAll(companyView) : false;
  const stores = useQuery({ queryKey: ['inventory-locations'], queryFn: listLocations, staleTime: 60_000 });
  const activeStores = (stores.data ?? []).filter((s) => s.is_active).map((s) => ({ id: s.id, name: s.name }));

  const create = useMutation({
    mutationFn: (payload: NewPlan) => createPlan(payload, locationId),
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: ['buy-plans'] });
      setCreating(false);
      if (data.plans.length === 1) navigate(planHref(data.plans[0]));
    }
  });

  const scopeStore = plans.data && plans.data.scope === 'location' ? plans.data.location : null;
  const groups = groupByStore(plans.data?.plans ?? []);

  return (
    <Box>
      <PageHeader
        title="Plan"
        subtitle="Drop a line sheet, get a proposal: one number per item, sized for your order date. One memo per store."
        right={
          <>
            {/* Only a role that sees every store picks one; a store's own role sees its store (the server's scope). */}
            {offerAll ? (
              <TextField
                select
                size="small"
                label="Store"
                value={locationId ?? ''}
                onChange={(e) => setParams(e.target.value ? { location_id: e.target.value } : {})}
                slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">All locations</MenuItem>
                {activeStores.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <Button
              variant="contained"
              onClick={() => {
                setFormKey((k) => k + 1);
                setCreating(true);
              }}
              disabled={plans.isError}
            >
              New plan
            </Button>
          </>
        }
      />

      {plans.isLoading ? <Skeleton variant="rounded" height={160} /> : null}
      {plans.isError ? <Alert severity="info">{serverSentence(plans.error, 'The plans could not be read. Try again.')}</Alert> : null}
      {plans.data && groups.length === 0 ? (
        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: '12px', p: 4, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 600 }}>No plans yet</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Start one for your next order: name it, pick the order date, then drop the line sheet.
          </Typography>
        </Box>
      ) : null}

      <Stack spacing={3}>
        {groups.map((group) => (
          <Box key={group.store.id} component="section" aria-label={group.store.name}>
            <Typography component="h2" sx={{ fontWeight: 600, mb: 1 }}>
              {group.store.name}
            </Typography>
            <Box
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', overflow: 'hidden', bgcolor: 'background.paper' }}
            >
              {group.plans.map((plan, i) => (
                <Box
                  key={plan.id}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'baseline',
                    px: 2,
                    py: 1.5,
                    borderTop: i ? '1px solid' : 0,
                    borderColor: 'divider',
                    flexWrap: 'wrap'
                  }}
                >
                  <Link component={RouterLink} to={planHref(plan)} sx={{ fontWeight: 600, minWidth: 180 }}>
                    {plan.name}
                  </Link>
                  <Typography variant="body2" color="text.secondary">
                    Order by {day(plan.target_date)} · selling {day(plan.window_start)} – {day(plan.window_end)}
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 'auto' }}>
                    {planStatusWord(plan)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Stack>

      <NewPlanDialog
        key={formKey}
        open={creating}
        busy={create.isPending}
        stores={activeStores}
        fixedStore={scopeStore}
        offerAll={offerAll && !scopeStore}
        errors={create.isError ? fieldErrors(create.error) : {}}
        error={
          create.isError && Object.keys(fieldErrors(create.error)).length === 0
            ? serverSentence(create.error, 'The plan could not be made.')
            : null
        }
        onClose={() => {
          setCreating(false);
          create.reset();
        }}
        onCreate={(payload) => create.mutate(payload)}
      />
    </Box>
  );
}
