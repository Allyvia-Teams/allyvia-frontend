// views/inventory/workspace/ReportsTab.tsx
//
// I1: Reports is the insights page (which keeps its own MUI tabs for now) or
// the QuickBooks posting screen. A two-option segmented control above the body
// is the only way into QuickBooks posting in-app, since its sidebar leaf is
// gone and the insights tabs do not list it.

import { lazy } from 'react';

import Loadable from 'ui-component/Loadable';

import { DEFAULT_VIEW } from '../tabs';
import SegmentedViews from './SegmentedViews';

const InventoryInsights = Loadable(lazy(() => import('views/inventory/InventoryInsights')));
const QuickBooksPosting = Loadable(lazy(() => import('views/inventory/QuickBooksPosting')));

const ANALYTICS = DEFAULT_VIEW.reports ?? 'sell-through';
const QUICKBOOKS = 'quickbooks';

const OPTIONS = [
  { view: ANALYTICS, label: 'Analytics' },
  { view: QUICKBOOKS, label: 'QuickBooks posting' }
];

export default function ReportsTab({ view }: { view: string | null }) {
  const quickbooks = view === QUICKBOOKS;
  return (
    <>
      <SegmentedViews tab="reports" view={quickbooks ? QUICKBOOKS : ANALYTICS} options={OPTIONS} label="Reports views" />
      {quickbooks ? <QuickBooksPosting logHref="/inventory/quickbooks/log" /> : <InventoryInsights initialView={view ?? undefined} />}
    </>
  );
}
