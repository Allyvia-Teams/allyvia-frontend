// views/inventory/workspace/LegacyInventoryRedirect.tsx
//
// Mounted on every old inventory path (legacyRoutes.LEGACY_INVENTORY_PATHS):
// replaces the URL with its place in the workspace, carrying the query.

import { Navigate, useLocation } from 'react-router-dom';

import { INVENTORY_PATH } from '../tabs';
import { legacyInventoryTarget } from '../legacyRoutes';

export default function LegacyInventoryRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate replace to={legacyInventoryTarget(pathname, search) ?? INVENTORY_PATH} />;
}
