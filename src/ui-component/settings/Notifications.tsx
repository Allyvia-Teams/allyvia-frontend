import Typography from '@mui/material/Typography';
import { IconBell } from '@tabler/icons-react';
import SettingsSectionCard from './SettingsSectionCard';

export default function Notifications() {
  return (
    <SettingsSectionCard
      title="Notifications"
      description="Configure how and when you receive alerts"
      icon={<IconBell size={24} stroke={1.5} />}
    >
      <Typography variant="body2" color="text.secondary">
        Email, in-app, and push notification preferences will live here. You will be able to choose which events trigger
        notifications and how you receive them.
      </Typography>
    </SettingsSectionCard>
  );
}
