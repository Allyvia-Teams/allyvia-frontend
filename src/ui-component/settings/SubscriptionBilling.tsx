import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { IconCreditCard, IconArrowRight } from '@tabler/icons-react';
import SettingsSectionCard from './SettingsSectionCard';
import { getPlanDetails } from 'config/plans';

type SubscriptionStatus = 'Active' | 'Trialing' | 'Past Due' | 'Canceled';

function getStatusChipColor(status: SubscriptionStatus): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Trialing':
      return 'warning';
    case 'Past Due':
      return 'warning';
    case 'Canceled':
      return 'error';
    default:
      return 'default';
  }
}

/** Settings summary card: navigates to billing page; plan/status are UI placeholders until billing is wired. */
export default function SubscriptionBilling() {
  const navigate = useNavigate();
  const details = getPlanDetails('Free');
  const status: SubscriptionStatus = 'Active';

  return (
    <Box
      component="div"
      onClick={() => navigate('/settings/billing')}
      sx={{
        cursor: 'pointer',
        height: '100%',
        '& .MuiCard-root': {
          transition: 'border-color 0.2s, box-shadow 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: (t) => t.shadows[2]
          }
        }
      }}
    >
      <SettingsSectionCard
        title="Subscription & Billing"
        description="Manage your plan and payment methods"
        icon={<IconCreditCard size={24} stroke={1.5} />}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" component="span">
            Current plan: <strong>{details.name}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" component="span">
            ·
          </Typography>
          <Chip label={status} color={getStatusChipColor(status)} size="small" sx={{ height: 20 }} />
        </Box>
        <Button
          variant="outlined"
          size="small"
          endIcon={<IconArrowRight size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            navigate('/settings/billing');
          }}
          sx={{ minWidth: 140 }}
        >
          View billing
        </Button>
      </SettingsSectionCard>
    </Box>
  );
}
