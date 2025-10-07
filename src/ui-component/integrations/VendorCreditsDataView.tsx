import React, { useState } from 'react';
import { Box } from '@mui/material';
import { QBEntityTable } from 'components/QBEntityTable';
import VendorCreditDetailDrawer from './VendorCreditDetailDrawer';
import { useSelector } from 'store';

interface VendorCreditsDataViewProps {
  companyId: string;
}

export default function VendorCreditsDataView({ companyId }: VendorCreditsDataViewProps) {
  const [selectedVendorCreditId, setSelectedVendorCreditId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const entityState = useSelector((state) => state.qbEntities.vendorcredit);
  const { items: vendorcredits } = entityState || { items: [] };

  const handleRowClick = (vendorcredit: any) => {
    const index = vendorcredits.findIndex((vc: any) => vc.id === vendorcredit.id);
    setSelectedVendorCreditId(vendorcredit.id);
    setSelectedIndex(index);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedVendorCreditId(null);
  };

  const handleVendorCreditNavigate = (vendorcreditId: string) => {
    const index = vendorcredits.findIndex((vc: any) => vc.id === vendorcreditId);
    setSelectedVendorCreditId(vendorcreditId);
    setSelectedIndex(index);
  };

  return (
    <Box>
      <QBEntityTable entityType="vendorcredit" onRowClick={handleRowClick} hideStats={false} hideActions={false} />

      <VendorCreditDetailDrawer
        open={drawerOpen}
        vendorcreditId={selectedVendorCreditId}
        vendorcredits={vendorcredits}
        currentIndex={selectedIndex}
        companyId={companyId}
        onClose={handleDrawerClose}
        onNavigate={handleVendorCreditNavigate}
      />
    </Box>
  );
}
