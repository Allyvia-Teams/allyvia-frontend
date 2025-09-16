import React from 'react';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import DocumentsTab from 'views/crm/tabs/DocumentsTab';

// ==============================|| DOCUMENTS PAGE ||============================== //

export default function DocumentsPage() {
  return (
    <MainCard title="Documents">
      <DocumentsTab />
    </MainCard>
  );
} 