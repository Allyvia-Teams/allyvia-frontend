import Typography from '@mui/material/Typography';
import { IconUsersGroup } from '@tabler/icons-react';
import SettingsSectionCard from './SettingsSectionCard';

export default function TeamPermissions() {
  return (
    <SettingsSectionCard
      title="Team & Permissions"
      description="Invite members and control access"
      icon={<IconUsersGroup size={24} stroke={1.5} />}
    >
      <Typography variant="body2" color="text.secondary">
        Invite team members, assign roles, and manage permissions for your organization. Role-based access and
        invite links will be configured here.
      </Typography>
    </SettingsSectionCard>
  );
}
