import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { IconSettings } from '@tabler/icons-react';

import { RedeemCodeDialog } from 'ui-component/inner-circle';
import { PageHeader } from 'ui-component/frame';
import Customers from './Customers';
import Outreach from './Outreach';
import Settings from './Settings';
import ThisWeek from './ThisWeek';
import { legacyTabTarget, parseDestination, type Destination } from './navigation';

// ==============================|| INNER CIRCLE PAGE ||============================== //
// The shell: one PageHeader with the three-way segmented control (This week |
// Customers | Outreach) plus a gear that opens Settings, and the destination
// switch. Legacy `?tab=` values are redirected to their destination on mount
// and on every param change (navigation.ts::legacyTabTarget).

export default function InnerCirclePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [redeemOpen, setRedeemOpen] = useState(false);

  useEffect(() => {
    const legacy = legacyTabTarget(searchParams);
    if (legacy) setSearchParams(legacy, { replace: true });
  }, [searchParams, setSearchParams]);

  const destination = parseDestination(searchParams.get('tab'));

  // Both header controls (this toggle and the gear below) push a new history
  // entry — only the legacy-redirect effect above replaces, so a redirect on
  // mount never leaves a stray legacy URL in back-button history.
  const handleDestinationChange = (_event: React.SyntheticEvent, value: Destination | null) => {
    if (!value) return;
    setSearchParams({ tab: value });
  };

  return (
    <>
      <PageHeader
        title="Inner Circle"
        right={
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={() => setRedeemOpen(true)}>
              Redeem code
            </Button>
            <IconButton aria-label="Inner Circle settings" onClick={() => setSearchParams({ tab: 'settings' })}>
              <IconSettings />
            </IconButton>
          </Stack>
        }
        tabs={
          <ToggleButtonGroup exclusive value={destination === 'settings' ? null : destination} onChange={handleDestinationChange}>
            <ToggleButton value="this-week">This week</ToggleButton>
            <ToggleButton value="customers">Customers</ToggleButton>
            <ToggleButton value="outreach">Outreach</ToggleButton>
          </ToggleButtonGroup>
        }
      />

      {destination === 'this-week' && <ThisWeek />}
      {destination === 'customers' && <Customers />}
      {destination === 'outreach' && <Outreach />}
      {destination === 'settings' && <Settings />}

      <RedeemCodeDialog open={redeemOpen} onClose={() => setRedeemOpen(false)} />
    </>
  );
}
