// Time Approval Page
import React from 'react';
import MainCard from 'ui-component/cards/MainCard';
import { useIsAdmin } from 'hooks/usePermission';
import TimeApprovalTab from '../employee-management/TimeApprovalTab';

export default function TimeApprovalPage() {
  const isAdmin = useIsAdmin();

  return (
    <MainCard title="Time Approval">
      <TimeApprovalTab isAdmin={isAdmin} />
    </MainCard>
  );
}
