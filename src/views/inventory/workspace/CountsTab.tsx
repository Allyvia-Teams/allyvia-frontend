// views/inventory/workspace/CountsTab.tsx
//
// I1: stock counts or transfers, chosen by ?view=; ?new=1 opens the create
// form on either, the way the old /new routes did.

import { lazy } from 'react';

import Loadable from 'ui-component/Loadable';

import SegmentedViews from './SegmentedViews';

const StockCountList = Loadable(lazy(() => import('views/inventory/StockCountList')));
const Transfers = Loadable(lazy(() => import('views/inventory/Transfers')));

const OPTIONS = [
  { view: 'counts', label: 'Stocktakes' },
  { view: 'transfers', label: 'Transfers' }
] as const;

export default function CountsTab({ view, creating }: { view: string | null; creating: boolean }) {
  return (
    <>
      <SegmentedViews tab="counts" view={view} options={OPTIONS} label="Counts views" />
      {view === 'transfers' ? <Transfers creating={creating} /> : <StockCountList creating={creating} />}
    </>
  );
}
