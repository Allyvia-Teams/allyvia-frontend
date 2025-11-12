// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';

// project imports
import LogoSection from '../LogoSection';
import SearchSection from './SearchSection';
import ProfileSection from './ProfileSection';
import GlobalSyncIndicator from './GlobalSyncIndicator';
import Button from '@mui/material/Button';
import { useDispatch, useSelector } from 'store';
import { kioskLock } from 'api/kiosk.api';
import { clearKioskSession } from 'store/kioskSlice';
import { useNavigate, useLocation } from 'react-router-dom';

import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { MenuOrientation, ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import { headerLogoWidthSm, headerLogoWidthLg, headerIconSize, headerSearchWidthMd, headerSearchWidthLg } from 'store/constant';

// assets
import { IconMenu2 } from '@tabler/icons-react';

// ==============================|| MAIN NAVBAR / HEADER ||============================== //

export default function Header() {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));

  const { mode, menuOrientation } = useConfig();
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;
  const isHorizontal = menuOrientation === MenuOrientation.HORIZONTAL && !downMD;

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const kiosk = useSelector((s) => s.kiosk);
  const roleType = useSelector((s) => s.auth.currentRole?.role_type);

  const showKioskLock =
    (roleType || '').toLowerCase() === 'member' && kiosk.isAuthenticated && !location.pathname.startsWith('/kiosk/login');

  const onLock = async () => {
    try {
      if (kiosk.token) await kioskLock(kiosk.token);
    } catch {}
    dispatch(clearKioskSession());
    navigate('/kiosk/login', { replace: true });
  };

  return (
    <>
      {/* logo & toggler button */}
      <Box
        sx={{
          width: downMD ? headerLogoWidthSm : headerLogoWidthLg,
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'row',
          justifyItems: 'flex-start',
          gap: 1
        }}
      >
        <Box component="span" sx={{ display: 'block', flexGrow: drawerOpen ? 1 : 0.05, transition: 'flex-grow 0.3s ease-in-out' }}>
          <LogoSection collapsed={!drawerOpen} />
        </Box>
        {!isHorizontal && (
          <Avatar
            variant="rounded"
            sx={{
              ...theme.typography.commonAvatar,
              ...theme.typography.mediumAvatar,
              overflow: 'hidden',
              transition: 'all .2s ease-in-out',
              bgcolor: mode === ThemeMode.DARK ? 'dark.main' : 'primary.light',
              color: mode === ThemeMode.DARK ? 'secondary.main' : 'primary.dark',
              '&:hover': {
                bgcolor: mode === ThemeMode.DARK ? 'secondary.main' : 'primary.dark',
                color: mode === ThemeMode.DARK ? 'secondary.light' : 'primary.light'
              }
            }}
            onClick={() => handlerDrawerOpen(!drawerOpen)}
            tabIndex={0}
            role="button"
            aria-label="Toggle sidebar"
            aria-pressed={drawerOpen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlerDrawerOpen(!drawerOpen);
              }
            }}
            color="inherit"
          >
            <IconMenu2 stroke={2} size={`${headerIconSize}px`} />
          </Avatar>
        )}
      </Box>

      {/* header search */}
      <SearchSection mdWidth={headerSearchWidthMd} lgWidth={headerSearchWidthLg} />
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ flexGrow: 1 }} />

      {/* Global synchronization status */}
      <GlobalSyncIndicator />

      {/* Kiosk Lock (member only, when kiosk session active) */}
      {showKioskLock && (
        <Button onClick={onLock} variant="outlined" color="error" sx={{ mr: 1 }}>
          Lock
        </Button>
      )}

      {/* profile (hidden for employees/members) */}
      {(roleType || '').toLowerCase() !== 'member' && <ProfileSection />}
    </>
  );
}
