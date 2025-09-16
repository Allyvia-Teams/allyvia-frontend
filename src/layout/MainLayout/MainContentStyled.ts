// material-ui
import { styled } from '@mui/material/styles';

// project imports
import { MenuOrientation, ThemeMode } from 'config';
import { drawerWidth, collapsedDrawerWidth, headerHeight, horizontalHeaderHeight, contentPadding, contentMargin } from 'store/constant';

interface MainStyleProps {
  open: boolean;
  menuOrientation: MenuOrientation;
  borderRadius: number;
}

// ==============================|| MAIN LAYOUT - STYLED ||============================== //

const MainContentStyled = styled('main', {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'menuOrientation' && prop !== 'borderRadius'
})<MainStyleProps>(({ theme, open, menuOrientation, borderRadius }) => ({
  backgroundColor: theme.palette.mode === ThemeMode.DARK ? theme.palette.dark[800] : theme.palette.grey[100],
  minWidth: '1%',
  width: '100%',
  minHeight: `calc(100vh - ${headerHeight}px)`,
  flexGrow: 1,
  padding: contentPadding,
  marginTop: headerHeight,
  marginRight: contentMargin,
  borderRadius: `${borderRadius}px`,
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  ...(!open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.shorter + 200
    }),
    [theme.breakpoints.up('md')]: {
      marginLeft: menuOrientation === MenuOrientation.VERTICAL ? -(drawerWidth - collapsedDrawerWidth) : contentMargin,
      width: `calc(100% - ${drawerWidth}px)`,
      marginTop: menuOrientation === MenuOrientation.HORIZONTAL ? horizontalHeaderHeight : headerHeight
    }
  }),
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.shorter + 200
    }),
    marginLeft: menuOrientation === MenuOrientation.HORIZONTAL ? contentMargin : 0,
    marginTop: menuOrientation === MenuOrientation.HORIZONTAL ? horizontalHeaderHeight : headerHeight,
    width: `calc(100% - ${drawerWidth}px)`,
    [theme.breakpoints.up('md')]: {
      marginTop: menuOrientation === MenuOrientation.HORIZONTAL ? horizontalHeaderHeight : headerHeight
    }
  }),
  [theme.breakpoints.down('md')]: {
    marginLeft: 0,
    marginRight: 0,
    padding: 16,
    marginTop: headerHeight,
    paddingBottom: 16,
    ...(!open && {
      width: '100%'
    })
  },
  [theme.breakpoints.down('sm')]: {
    marginLeft: 0,
    marginRight: 0
  },
  '@media (max-width:320px)': {
    padding: 12,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 80
  }
}));

export default MainContentStyled;
