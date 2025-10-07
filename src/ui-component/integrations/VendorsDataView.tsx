import React, { useState } from 'react';
import { Box } from '@mui/material';
import { QBEntityTable } from 'components/QBEntityTable';
import VendorDetailDrawer from './VendorDetailDrawer';
import { useSelector } from 'store';

interface VendorsDataViewProps {
  companyId: string;
}

export default function VendorsDataView({ companyId }: VendorsDataViewProps) {
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const vendors = useSelector((state) => state.qbEntities.vendor?.items || []);

  const handleRowClick = (vendor: any) => {
    const index = vendors.findIndex((v: any) => v.id === vendor.id);
    setSelectedVendorId(vendor.id);
    setSelectedIndex(index);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedVendorId(null);
  };

  const handleVendorNavigate = (vendorId: string) => {
    const index = vendors.findIndex((v: any) => v.id === vendorId);
    setSelectedVendorId(vendorId);
    setSelectedIndex(index);
  };

  return (
    <Box>
      <QBEntityTable entityType="vendor" onRowClick={handleRowClick} hideStats={false} hideActions={false} />

      <VendorDetailDrawer
        open={drawerOpen}
        vendorId={selectedVendorId}
        vendors={vendors}
        currentIndex={selectedIndex}
        companyId={companyId}
        onClose={handleDrawerClose}
        onNavigate={handleVendorNavigate}
      />
    </Box>
  );
}
