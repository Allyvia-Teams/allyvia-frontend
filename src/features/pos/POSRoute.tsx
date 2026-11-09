import React from 'react';
import { useSelector } from 'store';
import { selectEffectiveRoleType } from 'store/selectors/effectiveRole';

import POSPage from './POSPage';
import { isAdminOrAbove } from 'utils/role';

export default function POSRoute() {
  const roleType = useSelector(selectEffectiveRoleType);
  const role: 'employee' | 'owner' = isAdminOrAbove(roleType) || String(roleType ?? '').toLowerCase() === 'manager' ? 'owner' : 'employee';

  return <POSPage role={role} />;
}
