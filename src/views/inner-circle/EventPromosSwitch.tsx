import { useState } from 'react';
import useSWR from 'swr';

import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { getCompanyBusinessInfo, updateEventPromos } from 'api/settings';
import { useSelector } from 'store';
import { RailCard } from 'ui-component/frame';
import type { CompanyBusinessInfo } from 'types/settings';
import { companySaveErrorMessage, EVENT_PROMOS_DESCRIPTION, EVENT_PROMOS_TITLE, eventPromosSwitchView } from './eventPromo';

// ==============================|| INNER CIRCLE - EVENT-DRIVEN PROMOS SWITCH ||============================== //
// The owner's switch over `Company.event_promos_enabled` (E5/E6), in the
// Inner Circle Settings rail so it shows on every section.
//
// It gates NEW suggestions only. Turning it off hides nothing already written
// and stops nothing already switched on — the caption says so in both
// positions, because "off" on a switch reads as "stop everything" otherwise.
//
// Composition only: whether it shows, whether it can be turned and every word
// it says come from `eventPromosSwitchView` in the seam.

export default function EventPromosSwitch() {
  const companyId = useSelector((state) => state.auth.currentRole?.company_id);
  const roleType = useSelector((state) => state.auth.currentRole?.role_type);

  // The SAME SWR key the OS Settings page's company cards use, so the two read
  // one cached company rather than racing each other.
  const { data, mutate } = useSWR(companyId ? `company-${companyId}` : null, () => getCompanyBusinessInfo(companyId as string));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const view = eventPromosSwitchView(data, roleType, { saving });
  if (!view.visible || !companyId) return null;

  const handleToggle = async (next: boolean) => {
    if (!data) return;
    setSaving(true);
    setError(null);
    // Spread the whole cached company: `optimisticData` REPLACES the cache
    // entry, and the business-info form on the other page reads the same key.
    const optimistic: CompanyBusinessInfo = { ...data, event_promos_enabled: next };
    try {
      await mutate(async () => updateEventPromos(companyId, { event_promos_enabled: next }), {
        optimisticData: optimistic,
        rollbackOnError: true,
        revalidate: false
      });
    } catch (e) {
      setError(companySaveErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const control = (
    <Switch
      size="small"
      checked={view.checked}
      disabled={view.disabled}
      onChange={(_e, checked) => handleToggle(checked)}
      inputProps={{ 'aria-label': EVENT_PROMOS_TITLE }}
    />
  );

  return (
    <RailCard
      title={EVENT_PROMOS_TITLE}
      action={
        // A disabled switch fires no pointer events, so the reason needs a
        // wrapper to hover (OutreachRowActions' `blockable`).
        view.disabledReason ? (
          <Tooltip title={view.disabledReason}>
            <span>{control}</span>
          </Tooltip>
        ) : (
          control
        )
      }
      note={error ?? view.caption}
    >
      <Box sx={{ px: '14px', py: '10px' }}>
        <Typography sx={{ fontSize: '0.875rem', color: 'text.primary', lineHeight: 1.45, textWrap: 'pretty' }}>
          {EVENT_PROMOS_DESCRIPTION}
        </Typography>
        {view.disabledReason ? (
          <Typography sx={{ mt: 0.5, fontSize: '0.8125rem', color: 'text.disabled' }}>{view.disabledReason}</Typography>
        ) : null}
      </Box>
    </RailCard>
  );
}
