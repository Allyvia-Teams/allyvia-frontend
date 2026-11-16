import { Navigate, useLocation } from 'react-router-dom';
import FinanceSnapshot from './snapshot/FinanceSnapshot';
import { legacyFinanceRedirect } from './entryLink';

// Finance & accounting: one snapshot page for every owner (docs/finance-tab-plan.md, Task 7),
// with routed detail pages under /finance/* (Task 8). A link that still names an old tab
// (`?tab=expenses&tool=import`) is sent to the page that now holds it.
export default function Finance() {
  const { search } = useLocation();
  const target = legacyFinanceRedirect(search);
  if (target) return <Navigate to={target} replace />;
  return <FinanceSnapshot />;
}
