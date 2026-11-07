// views/inventory/workspace/ReportsTab.tsx
//
// I1: Reports is the insights page (which reads ?view= for its own tabs) or
// the QuickBooks posting screen. I4 gives it a segmented control of its own.

import { lazy } from 'react';

import Loadable from 'ui-component/Loadable';

const InventoryInsights = Loadable(lazy(() => import('views/inventory/InventoryInsights')));
const QuickBooksPosting = Loadable(lazy(() => import('views/inventory/QuickBooksPosting')));

export default function ReportsTab({ view }: { view: string | null }) {
  return view === 'quickbooks' ? <QuickBooksPosting logHref="/inventory/quickbooks/log" /> : <InventoryInsights />;
}
