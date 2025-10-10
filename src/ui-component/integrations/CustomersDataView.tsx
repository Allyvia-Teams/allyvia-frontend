import React, { useState } from 'react';
import { Box } from '@mui/material';
import { QBEntityTable } from 'ui-component/common/QBEntityTable';
import CustomerDetailDrawer from './CustomerDetailDrawer';
import { useSelector } from 'store';

interface CustomersDataViewProps {
  companyId: string;
}

export default function CustomersDataView({ companyId }: CustomersDataViewProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const entityState = useSelector((state) => state.qbEntities.customer);
  const { items: customers } = entityState || { items: [] };

  const handleRowClick = (customer: any) => {
    const index = customers.findIndex((c: any) => c.id === customer.id);
    setSelectedCustomerId(customer.id);
    setSelectedIndex(index);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedCustomerId(null);
  };

  const handleCustomerNavigate = (customerId: string) => {
    const index = customers.findIndex((c: any) => c.id === customerId);
    setSelectedCustomerId(customerId);
    setSelectedIndex(index);
  };

  return (
    <Box>
      <QBEntityTable entityType="customer" onRowClick={handleRowClick} hideStats={false} hideActions={false} />

      <CustomerDetailDrawer
        open={drawerOpen}
        customerId={selectedCustomerId}
        customers={customers}
        currentIndex={selectedIndex}
        companyId={companyId}
        onClose={handleDrawerClose}
        onNavigate={handleCustomerNavigate}
      />
    </Box>
  );
}
