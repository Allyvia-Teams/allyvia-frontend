// views/inventory/Locations.tsx
//
// Route wrapper. LocationManager is the whole page; this only supplies the card
// chrome the other inventory routes use.

import MainCard from 'ui-component/cards/MainCard';

import LocationManager from './LocationManager';

export default function LocationsPage() {
  return (
    <MainCard content={false} sx={{ p: 2.5 }}>
      <LocationManager />
    </MainCard>
  );
}
