import { useNavigate } from 'react-router-dom';

import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { IconBuildingBank } from '@tabler/icons-react';

import SettingsSectionCard from 'ui-component/settings/SettingsSectionCard';

import { connectedSummary } from './format';
import { errorStatus, useBankConnections } from './enabled';
import { useFinancialSource } from 'views/finance/useFinancialSource';
import { moneySourceCard } from 'views/finance/expenseTruth';

export const BANK_HOME_ROUTE = '/integrations/bank';

/**
 * Settings > Integrations pointer to the one bank home (/integrations/bank),
 * where accounts are connected and managed. Transactions live in Finance.
 *
 * Hidden entirely while the server flag is off (the list endpoint answers 404).
 */
export default function BankConnectionsCard() {
  const navigate = useNavigate();
  const { data, error } = useBankConnections();
  const source = useFinancialSource();
  const status = errorStatus(error);
  if (error && (status === 404 || status === 403)) return null;
  // QuickBooks connected: it is the expense truth, and the server refuses a bank link.
  const card = moneySourceCard(source.data?.quickbooks_connected);

  return (
    <SettingsSectionCard
      title="Bank accounts"
      description={
        card.quickbooks
          ? 'Your expenses come from QuickBooks, so no bank feed is used.'
          : 'Connect and manage your business bank and card accounts on the bank connection page. Read-only; Allyvia never moves money.'
      }
      icon={<IconBuildingBank />}
      action={
        card.showButton ? (
          <Button variant="outlined" size="small" onClick={() => navigate(BANK_HOME_ROUTE)}>
            Manage bank accounts
          </Button>
        ) : undefined
      }
    >
      <Typography variant="body2" color="text.secondary">
        {card.line ?? (data ? connectedSummary(data) : 'Loading…')}
      </Typography>
    </SettingsSectionCard>
  );
}
