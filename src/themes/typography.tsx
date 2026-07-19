// material-ui
import { Theme, TypographyVariantsOptions } from '@mui/material/styles';

// project imports
import { ThemeMode } from 'config';

// types
import { FontFamily } from 'types/config';

export default function Typography(theme: Theme, borderRadius: number, fontFamily: FontFamily): TypographyVariantsOptions {
  return {
    fontFamily,
    h6: {
      fontWeight: 500,
      color: theme.palette.mode === ThemeMode.DARK ? theme.palette.grey[600] : theme.palette.grey[900],
      fontSize: '0.75rem',
      letterSpacing: '0.01em'
    },
    h5: {
      fontSize: '0.875rem',
      color: theme.palette.mode === ThemeMode.DARK ? theme.palette.grey[600] : theme.palette.grey[900],
      fontWeight: 600,
      letterSpacing: '-0.005em'
    },
    h4: {
      fontSize: '1rem',
      color: theme.palette.mode === ThemeMode.DARK ? theme.palette.grey[600] : theme.palette.grey[900],
      fontWeight: 600,
      letterSpacing: '-0.01em'
    },
    h3: {
      // Page titles — 22px bold ink, per the design system
      fontSize: '1.375rem',
      color: theme.palette.mode === ThemeMode.DARK ? theme.palette.grey[600] : theme.palette.grey[900],
      fontWeight: 700,
      letterSpacing: '-0.015em',
      lineHeight: 1.4
    },
    h2: {
      fontSize: '1.5rem',
      color: theme.palette.mode === ThemeMode.DARK ? theme.palette.grey[600] : theme.palette.grey[900],
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.35
    },
    h1: {
      fontSize: '2rem',
      color: theme.palette.mode === ThemeMode.DARK ? theme.palette.grey[600] : theme.palette.grey[900],
      fontWeight: 700,
      letterSpacing: '-0.025em',
      lineHeight: 1.25
    },
    subtitle1: {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: theme.palette.text.dark,
      lineHeight: 1.5
    },
    subtitle2: {
      fontSize: '0.75rem',
      fontWeight: 500,
      color: theme.palette.text.secondary,
      lineHeight: 1.5
    },
    caption: {
      fontSize: '0.75rem',
      color: theme.palette.text.secondary,
      fontWeight: 400,
      lineHeight: 1.5
    },
    body1: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6
    },
    body2: {
      fontSize: '0.8125rem',
      letterSpacing: '0em',
      fontWeight: 400,
      lineHeight: 1.6,
      color: theme.palette.text.primary
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '0.875rem',
      letterSpacing: '-0.005em'
    },
    customInput: {
      marginTop: 1,
      marginBottom: 1,
      '& > label': {
        top: 23,
        left: 0,
        color: theme.palette.grey[500],
        '&[data-shrink="false"]': {
          top: 5
        }
      },
      '& > div > input': {
        padding: '30.5px 14px 11.5px !important'
      },
      '& legend': {
        display: 'none'
      },
      '& fieldset': {
        top: 0
      }
    },
    mainContent: {
      backgroundColor: theme.palette.mode === ThemeMode.DARK ? theme.palette.dark[800] : theme.palette.background.paper,
      width: '100%',
      minHeight: 'calc(100vh - 88px)',
      flexGrow: 1,
      padding: '20px',
      marginTop: '88px',
      marginRight: '20px',
      borderRadius: `${borderRadius}px`
    },
    menuCaption: {
      // Sidebar group labels — small uppercase, letter-spaced, muted
      fontSize: '0.6875rem',
      fontWeight: 600,
      color: theme.palette.text.secondary,
      padding: '6px',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginTop: '10px'
    },
    subMenuCaption: {
      fontSize: '0.6875rem',
      fontWeight: 500,
      color: theme.palette.text.secondary,
      textTransform: 'capitalize'
    },
    commonAvatar: {
      cursor: 'pointer',
      borderRadius: '8px'
    },
    smallAvatar: {
      width: '22px',
      height: '22px',
      fontSize: '1rem'
    },
    mediumAvatar: {
      width: '34px',
      height: '34px',
      fontSize: '1.2rem'
    },
    largeAvatar: {
      width: '44px',
      height: '44px',
      fontSize: '1.5rem'
    }
  };
}
