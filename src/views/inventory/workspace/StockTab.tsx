// views/inventory/workspace/StockTab.tsx
//
// I1: Stock is the style catalogue or the flat item grid, chosen by ?view=.
// I3 replaces both with one embedded list.

import { lazy } from 'react';

import Loadable from 'ui-component/Loadable';

import SegmentedViews from './SegmentedViews';

const StyleCatalog = Loadable(lazy(() => import('views/inventory/StyleCatalog')));
const InventoryPage = Loadable(lazy(() => import('views/inventory')));

const OPTIONS = [
  { view: 'styles', label: 'Styles' },
  { view: 'items', label: 'Items' }
] as const;

export default function StockTab({ view }: { view: string | null }) {
  return (
    <>
      <SegmentedViews tab="stock" view={view} options={OPTIONS} label="Stock views" />
      {view === 'items' ? <InventoryPage /> : <StyleCatalog />}
    </>
  );
}
