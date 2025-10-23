import React, { useState } from 'react';
import { Box } from '@mui/material';
import { QBEntityTable } from 'ui-component/common/QBEntityTable';
import BillDetailDrawer from './BillDetailDrawer';
import { useSelector } from 'store';

interface BillsDataViewProps {
  companyId: string;
}

export default function BillsDataView({ companyId }: BillsDataViewProps) {
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const entityState = useSelector((state) => state.qbEntities.bill);
  const { items: bills } = entityState || { items: [] };

  const handleRowClick = (bill: any) => {
    const index = bills.findIndex((b: any) => b.id === bill.id);
    setSelectedBillId(bill.id);
    setSelectedIndex(index);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedBillId(null);
  };

  const handleBillNavigate = (billId: string) => {
    const index = bills.findIndex((b: any) => b.id === billId);
    setSelectedBillId(billId);
    setSelectedIndex(index);
  };

  return (
    <Box>
      <QBEntityTable entityType="bill" onRowClick={handleRowClick} hideStats={false} hideActions={false} />

      <BillDetailDrawer
        open={drawerOpen}
        billId={selectedBillId}
        bills={bills}
        currentIndex={selectedIndex}
        companyId={companyId}
        onClose={handleDrawerClose}
        onNavigate={handleBillNavigate}
      />
    </Box>
  );
}
