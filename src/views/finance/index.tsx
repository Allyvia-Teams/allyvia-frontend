import { Navigate, useLocation } from 'react-router-dom';
import FinanceSnapshot from './snapshot/FinanceSnapshot';
import { CLASSIC_HREF } from './snapshot/snapshotView';

// Finance & accounting: one snapshot page for every owner (docs/finance-tab-plan.md, Task 7).
// The old tabbed page and the bank page stay at /finance/classic until the detail pages
// replace them (Task 8). A link that names an old tab (`?tab=expenses&tool=import` from the
// Import data screen) still opens it there.
export default function Finance() {
  const { search } = useLocation();
  if (new URLSearchParams(search).has('tab')) return <Navigate to={`${CLASSIC_HREF}${search}`} replace />;
  return <FinanceSnapshot />;
}
