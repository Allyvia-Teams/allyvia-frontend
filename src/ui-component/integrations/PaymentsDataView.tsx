import React, { useState } from 'react';
import { Box } from '@mui/material';
import { QBEntityTable } from 'components/QBEntityTable';
import PaymentDetailDrawer from './PaymentDetailDrawer';
import { useSelector } from 'store';

interface PaymentsDataViewProps {
  companyId: string;
}

export default function PaymentsDataView({ companyId }: PaymentsDataViewProps) {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const entityState = useSelector((state) => state.qbEntities.payment);
  const { items: payments } = entityState || { items: [] };

  const handleRowClick = (payment: any) => {
    const index = payments.findIndex((p: any) => p.id === payment.id);
    setSelectedPaymentId(payment.id);
    setSelectedIndex(index);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedPaymentId(null);
  };

  const handlePaymentNavigate = (paymentId: string) => {
    const index = payments.findIndex((p: any) => p.id === paymentId);
    setSelectedPaymentId(paymentId);
    setSelectedIndex(index);
  };

  return (
    <Box>
      <QBEntityTable entityType="payment" onRowClick={handleRowClick} hideStats={false} hideActions={false} />

      <PaymentDetailDrawer
        open={drawerOpen}
        paymentId={selectedPaymentId}
        payments={payments}
        currentIndex={selectedIndex}
        companyId={companyId}
        onClose={handleDrawerClose}
        onNavigate={handlePaymentNavigate}
      />
    </Box>
  );
}
