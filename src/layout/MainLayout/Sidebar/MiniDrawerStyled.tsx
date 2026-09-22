// material-ui
import { styled, Theme, CSSObject } from '@mui/material/styles';
import Drawer from '@mui/material/Drawer';

// project imports
import { ThemeMode } from 'config';
import { collapsedDrawerWidth, drawerWidth } from 'store/constant';

function openedMixin(theme: Theme): CSSObject {
  return {
    width: drawerWidth,
    zIndex: 1099,
    background: theme.palette.background.default,
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: theme.palette.mode === ThemeMode.DARK ? theme.customShadows.z1 : 'none',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen + 200
    })
  };
}

function closedMixin(theme: Theme): CSSObject {
  return {
    zIndex: 1099,
    background: theme.palette.background.default,
    overflowX: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    width: collapsedDrawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen + 200
    })
  };
}

// ==============================|| DRAWER - MINI STYLED ||============================== //

// `seamless` drops the right hairline: under a dark chrome template the drawer and the app bar
// share one surface, and the white content panel separates itself.
const MiniDrawerStyled = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' && prop !== 'seamless' })<{
  open: boolean;
  seamless?: boolean;
}>(({ theme, open, seamless }) => ({
  width: drawerWidth,
  borderRight: '0px',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  ...(open && {
    ...openedMixin(theme),
    '& .MuiDrawer-paper': openedMixin(theme)
  }),
  ...(!open && {
    ...closedMixin(theme),
    '& .MuiDrawer-paper': closedMixin(theme)
  }),
  // Three classes so this outranks the theme's Paper override (`.MuiPaper-root.MuiDrawer-paper`).
  ...(seamless && { '& .MuiDrawer-paper.MuiPaper-root': { borderRight: 'none' } })
}));

export default MiniDrawerStyled;
