import { useState } from 'react';
import { QBEntityTable } from 'components/QBEntityTable';
import InvoiceDetailDrawer from './InvoiceDetailDrawer';
import { QBInvoice } from 'types/qb';
import { useSelector } from 'store';

interface InvoicesDataViewProps {
  companyId: string;
}

const InvoicesDataView = ({ companyId }: InvoicesDataViewProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get invoices from Redux store
  const { items: invoices } = useSelector((state) => state.qbEntities.invoice || { items: [] });

  const handleRowClick = (invoice: QBInvoice) => {
    const index = invoices.findIndex((inv: QBInvoice) => inv.id === invoice.id);
    setCurrentIndex(index);
    setSelectedInvoiceId(invoice.id);
    setDrawerOpen(true);
  };

  const handleNavigate = (invoiceId: string) => {
    const index = invoices.findIndex((inv: QBInvoice) => inv.id === invoiceId);
    setCurrentIndex(index);
    setSelectedInvoiceId(invoiceId);
  };

  return (
    <>
      <QBEntityTable entityType="invoice" onRowClick={handleRowClick} />

      <InvoiceDetailDrawer
        open={drawerOpen}
        invoiceId={selectedInvoiceId}
        invoices={invoices}
        currentIndex={currentIndex}
        companyId={companyId}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedInvoiceId(null);
        }}
        onNavigate={handleNavigate}
      />
    </>
  );
};

export default InvoicesDataView;
