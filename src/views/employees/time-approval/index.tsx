// Time Approval Page
import React from 'react';
import MainCard from 'ui-component/cards/MainCard';
import { useEmployeePermissions, useRole } from 'hooks/usePermission';
import TimeApprovalTab from '../employee-management/TimeApprovalTab';

export default function TimeApprovalPage() {
  const role = useRole();
  const { approve: canApprove } = useEmployeePermissions();

  return (
    <MainCard title="Time Approval">
      <TimeApprovalTab key={role?.id} canApprove={canApprove} />
    </MainCard>
  );
}
