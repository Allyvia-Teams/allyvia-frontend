import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

// icons
import { IconSettings } from '@tabler/icons-react';

// project imports
import { useSelector } from 'store';
import { initials } from 'ui-component/frame/frame';

// ==============================|| SIDEBAR - USER ROW ||============================== //
// Design handoff 1.6: the user row pinned to the bottom of the sidebar — a 28px
// initials disc, the name at 12.5px, and a settings glyph. Opens the profile.

export default function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const user = useSelector((state) => state.auth?.user);
  const first = user?.first_name ?? '';
  const last = user?.last_name ?? '';
  const name = `${first} ${last}`.trim() || user?.email || 'Your account';
  const mark = initials(first, last, user?.email) || '·';

  return (
    <Box sx={{ mt: 'auto', flexShrink: 0, borderTop: '1px solid', borderColor: 'divider', p: collapsed ? '12px 0' : '12px 10px' }}>
      <ButtonBase
        component={RouterLink}
        to="/me"
        aria-label={`${name} — profile`}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: '10px',
          borderRadius: '8px',
          px: collapsed ? 0 : '4px',
          py: '2px',
          textAlign: 'left',
          '&:hover': { bgcolor: 'grey.100' }
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '999px',
            bgcolor: 'grey.100',
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 600,
            flexShrink: 0
          }}
        >
          {mark}
        </Box>
        {!collapsed && (
          <>
            <Typography noWrap title={name} sx={{ fontSize: '0.875rem', color: 'text.primary', minWidth: 0, flex: 1 }}>
              {name}
            </Typography>
            <Box component="span" sx={{ display: 'flex', color: 'text.disabled', flexShrink: 0 }}>
              <IconSettings size={16} stroke={1.75} />
            </Box>
          </>
        )}
      </ButtonBase>
    </Box>
  );
}
