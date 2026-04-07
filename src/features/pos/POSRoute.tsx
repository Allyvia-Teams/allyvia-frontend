import React from 'react';
import { useSelector } from 'store';

import POSPage from './POSPage';

export default function POSRoute() {
  const roleType = useSelector((s) => s.auth.currentRole?.role_type);
  const role: 'employee' | 'owner' = roleType && ['admin', 'manager'].includes(String(roleType).toLowerCase()) ? 'owner' : 'employee';

  return <POSPage role={role} />;
}
