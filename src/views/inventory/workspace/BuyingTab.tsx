// views/inventory/workspace/BuyingTab.tsx
//
// I1: Buying is purchase orders, season plans or vendors, chosen by ?view=.
// Plan only for the roles the API lets in (flowLinks.canOpenPlan); a member
// asking for it gets orders rather than Plan's 403.

import { lazy } from 'react';

import Loadable from 'ui-component/Loadable';
import { useSelector } from 'store';
import { selectEffectiveRoleType } from 'store/selectors/effectiveRole';

import { canOpenPlan } from '../flowLinks';
import SegmentedViews from './SegmentedViews';

const PurchaseOrders = Loadable(lazy(() => import('views/inventory/PurchaseOrders')));
const PlanList = Loadable(lazy(() => import('views/inventory/plan/components/PlanList')));
const Suppliers = Loadable(lazy(() => import('views/inventory/Suppliers')));

export default function BuyingTab({ view }: { view: string | null }) {
  const roleType = useSelector(selectEffectiveRoleType) as string | undefined;
  const planAllowed = canOpenPlan(roleType);
  const shown = view === 'plan' && !planAllowed ? 'orders' : view;
  const options = [
    { view: 'orders', label: 'Orders' },
    ...(planAllowed ? [{ view: 'plan', label: 'Plan' }] : []),
    { view: 'suppliers', label: 'Vendors' }
  ];

  let body;
  if (shown === 'plan') body = <PlanList />;
  else if (shown === 'suppliers') body = <Suppliers />;
  else body = <PurchaseOrders />;

  return (
    <>
      <SegmentedViews tab="buying" view={shown} options={options} label="Buying views" />
      {body}
    </>
  );
}
