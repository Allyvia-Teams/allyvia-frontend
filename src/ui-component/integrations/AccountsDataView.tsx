import React, { useState } from 'react';
import { Box } from '@mui/material';
import { QBEntityTable } from 'ui-component/common/QBEntityTable';
import AccountDetailDrawer from './AccountDetailDrawer';
import { useSelector } from 'store';

interface AccountsDataViewProps {
  companyId: string;
}

export default function AccountsDataView({ companyId }: AccountsDataViewProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const entityState = useSelector((state) => state.qbEntities.account);
  const { items: accounts } = entityState || { items: [] };

  const handleRowClick = (account: any) => {
    const index = accounts.findIndex((a: any) => a.id === account.id);
    setSelectedAccountId(account.id);
    setSelectedIndex(index);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedAccountId(null);
  };

  const handleAccountNavigate = (accountId: string) => {
    const index = accounts.findIndex((a: any) => a.id === accountId);
    setSelectedAccountId(accountId);
    setSelectedIndex(index);
  };

  return (
    <Box>
      <QBEntityTable entityType="account" onRowClick={handleRowClick} hideStats={false} hideActions={false} />

      <AccountDetailDrawer
        open={drawerOpen}
        accountId={selectedAccountId}
        accounts={accounts}
        currentIndex={selectedIndex}
        companyId={companyId}
        onClose={handleDrawerClose}
        onNavigate={handleAccountNavigate}
      />
    </Box>
  );
}
