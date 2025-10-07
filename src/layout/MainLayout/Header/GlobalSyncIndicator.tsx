import { useLocation } from 'react-router-dom';
import { useSelector } from 'store';
import { Chip } from '@mui/material';
import { IconRefresh } from '@tabler/icons-react';

const spinKeyframes = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

export default function GlobalSyncIndicator() {
  const location = useLocation();
  const { isAnySyncing, completedCount, totalEntities } = useSelector((state) => state.syncProgress);

  const isOnIntegrationsPage = location.pathname.includes('/integrations/quickbooks');
  const shouldShow = isAnySyncing && !isOnIntegrationsPage;

  if (!shouldShow) return null;

  return (
    <>
      <style>{spinKeyframes}</style>
      <Chip
        icon={<IconRefresh style={{ animation: 'spin 1s linear infinite', color: 'white' }} />}
        label={`Syncing ${completedCount}/${totalEntities}`}
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          height: 32,
          fontSize: '0.875rem',
          mr: 2,
          '& .MuiChip-icon': {
            color: 'white'
          }
        }}
      />
    </>
  );
}
