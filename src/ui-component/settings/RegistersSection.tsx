import Stack from '@mui/material/Stack';

import RegisterBehaviourCard from './RegisterBehaviourCard';
import RegisterDevicesCard from './RegisterDevicesCard';
import RegisterReadersCard from './RegisterReadersCard';

interface RegistersProps {
  companyId: string;
}

/**
 * Settings → Registers. Everything a store does once, before the iPad arrives:
 * pair the tills, claim the card readers, and decide how the registers behave.
 *
 * Admin-only, like the tab that renders it. Every route underneath is
 * admin-gated server-side too, so a non-admin who reached this by URL sees the
 * cards degrade rather than a blank page.
 */
export default function Registers({ companyId }: RegistersProps) {
  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      <RegisterDevicesCard companyId={companyId} />
      <RegisterReadersCard companyId={companyId} />
      <RegisterBehaviourCard companyId={companyId} />
    </Stack>
  );
}
