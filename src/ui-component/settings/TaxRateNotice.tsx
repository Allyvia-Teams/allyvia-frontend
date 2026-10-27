// One line at the top of Settings (and Locations) when a store's sales tax
// rate needs the merchant: the first store's notice, plus how many more.

import { useQuery } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';

import { listLocations, type Location } from 'api/inventoryStock.api';

import { LOCATIONS_QUERY_KEY } from './LocationTaxRateEditor';
import { taxNoticeLine } from './locationTax';

/** Presentational: renders nothing when no store has a notice. */
export function TaxRateNoticeLine({ locations }: { locations: Location[] }) {
  const line = taxNoticeLine(locations);
  if (!line) return null;
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      {line}
    </Alert>
  );
}

export default function TaxRateNotice() {
  const { data } = useQuery({ queryKey: LOCATIONS_QUERY_KEY, queryFn: listLocations });
  return <TaxRateNoticeLine locations={data ?? []} />;
}
