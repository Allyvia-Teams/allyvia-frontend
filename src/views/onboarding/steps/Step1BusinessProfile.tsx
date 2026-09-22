import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { CompanyBusinessInfo } from 'types/settings';
import BusinessInfo from 'ui-component/settings/BusinessInfo';
import { isProfileComplete } from '../wizardState';

interface Step1BusinessProfileProps {
  companyId: string;
  profile: CompanyBusinessInfo | undefined;
  roleType: string | undefined;
}

// Step 1 embeds the existing settings form as-is (zero form duplication).
// BusinessInfo and the wizard share the SWR key `company-${companyId}`, so
// its post-save mutate() updates the wizard's Next gate for free.
export default function Step1BusinessProfile({ companyId, profile, roleType }: Step1BusinessProfileProps) {
  const complete = isProfileComplete(profile);

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Tell us about your business. Your industry and address help us map and validate the data you import.
      </Typography>

      {(roleType || '').toLowerCase() === 'member' && (
        <Alert severity="info">Only admins can edit the business profile. Ask an admin to complete it.</Alert>
      )}

      <BusinessInfo companyId={companyId} />

      {!complete && (
        <Typography variant="caption" color="text.secondary">
          Add your industry and street address to continue.
        </Typography>
      )}
    </Stack>
  );
}
