import Typography from '@mui/material/Typography';
import { IconUser } from '@tabler/icons-react';
import SettingsSectionCard from './SettingsSectionCard';

export default function AccountSettings() {
  return (
    <SettingsSectionCard
      title="Account Settings"
      description="Manage your profile and account preferences"
      icon={<IconUser size={24} stroke={1.5} />}
    >
      <Typography variant="body2" color="text.secondary">
        Here you will be able to update your name, email, profile photo, and other account details. Business information
        and timezone preferences will also live in this section.
      </Typography>
    </SettingsSectionCard>
  );
}
