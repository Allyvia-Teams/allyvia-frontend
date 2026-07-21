import { Navigate, useSearchParams } from 'react-router-dom';

import { buildCrmRedirectTarget } from 'views/inner-circle/navigation';

// Legacy /crm deep links → their merged Inner Circle equivalents.
// Keeps old bookmarks working after the CRM tab was folded into Inner Circle.
export default function CrmRedirect() {
  const [searchParams] = useSearchParams();
  return <Navigate to={buildCrmRedirectTarget(searchParams)} replace />;
}
