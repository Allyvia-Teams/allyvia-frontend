import React, { useState } from 'react';
import { Box } from '@mui/material';
import { QBEntityTable } from 'components/QBEntityTable';
import PurchaseDetailDrawer from './PurchaseDetailDrawer';
import { useSelector } from 'store';

interface PurchasesDataViewProps {
  companyId: string;
}

export default function PurchasesDataView({ companyId }: PurchasesDataViewProps) {
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const entityState = useSelector((state) => state.qbEntities.purchase);
  const { items: purchases } = entityState || { items: [] };

  const handleRowClick = (purchase: any) => {
    const index = purchases.findIndex((p: any) => p.id === purchase.id);
    setSelectedPurchaseId(purchase.id);
    setSelectedIndex(index);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedPurchaseId(null);
  };

  const handlePurchaseNavigate = (purchaseId: string) => {
    const index = purchases.findIndex((p: any) => p.id === purchaseId);
    setSelectedPurchaseId(purchaseId);
    setSelectedIndex(index);
  };

  return (
    <Box>
      <QBEntityTable entityType="purchase" onRowClick={handleRowClick} hideStats={false} hideActions={false} />

      <PurchaseDetailDrawer
        open={drawerOpen}
        purchaseId={selectedPurchaseId}
        purchases={purchases}
        currentIndex={selectedIndex}
        companyId={companyId}
        onClose={handleDrawerClose}
        onNavigate={handlePurchaseNavigate}
      />
    </Box>
  );
}
