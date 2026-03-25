import Typography from '@mui/material/Typography';
import { IconLock } from '@tabler/icons-react';
import SettingsSectionCard from './SettingsSectionCard';

export default function Security() {
  return (
    <SettingsSectionCard
      title="Security"
      description="Password, two-factor auth, and session management"
      icon={<IconLock size={24} stroke={1.5} />}
    >
      <Typography variant="body2" color="text.secondary">
        Change your password, enable two-factor authentication, and manage active sessions. Security and login history
        will be available in this section.
      </Typography>
    </SettingsSectionCard>
  );
}
