// Sales tax per store, below the company rate in Business Info.

import { useQuery } from '@tanstack/react-query';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { listLocations } from 'api/inventoryStock.api';

import LocationTaxRateEditor, { LOCATIONS_QUERY_KEY } from './LocationTaxRateEditor';

export default function LocationTaxRates() {
  const { data, isLoading, isError } = useQuery({ queryKey: LOCATIONS_QUERY_KEY, queryFn: listLocations });
  const stores = (data ?? []).filter((location) => location.is_active);

  return (
    <Stack spacing={1.5}>
      <div>
        <Typography variant="subtitle2">Sales tax by store</Typography>
        <Typography variant="body2" color="text.secondary">
          Each store charges its own rate at checkout. Add your local tax if the state base rate is not the full rate where the store is.
        </Typography>
      </div>
      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Loading stores...
        </Typography>
      ) : isError ? (
        <Typography variant="body2" color="error">
          Your stores could not be loaded.
        </Typography>
      ) : !stores.length ? (
        <Typography variant="body2" color="text.secondary">
          No stores yet.
        </Typography>
      ) : (
        stores.map((location) => (
          <Stack key={location.id} direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }} alignItems={{ sm: 'center' }}>
            <Typography variant="body2" sx={{ minWidth: 180, fontWeight: 500 }}>
              {location.name}
            </Typography>
            <LocationTaxRateEditor location={location} />
          </Stack>
        ))
      )}
    </Stack>
  );
}
