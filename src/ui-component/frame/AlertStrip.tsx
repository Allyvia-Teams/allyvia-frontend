import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

// icons
import { IconAlertTriangle } from '@tabler/icons-react';

// project imports
import { ThemeMode } from 'config';

// ==============================|| FRAME - ALERT STRIP ||============================== //
// Design handoff 1.1 step 3: one line, 9px 12px, warning tint, 3px left border,
// title 13/600 in warning.dark, body 13, right-aligned link action. Never a card
// with a header.

export interface AlertStripProps {
  title: ReactNode;
  body?: ReactNode;
  action?: { label: string; to?: string; onClick?: () => void };
}

export default function AlertStrip({ title, body, action }: AlertStripProps) {
  const theme = useTheme();
  const dark = theme.palette.mode === ThemeMode.DARK;
  const main = theme.palette.warning.main;

  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        px: '12px',
        py: '9px',
        mb: 2,
        borderRadius: '8px',
        border: `1px solid ${alpha(main, dark ? 0.4 : 0.32)}`,
        borderLeft: `3px solid ${main}`,
        bgcolor: alpha(main, dark ? 0.12 : 0.08)
      }}
    >
      <IconAlertTriangle size={16} color={dark ? main : '#b46a00'} style={{ flexShrink: 0 }} />
      <Typography component="span" sx={{ fontSize: '0.875rem', fontWeight: 600, color: dark ? main : '#7c4a00' }}>
        {title}
      </Typography>
      {body ? (
        <Typography component="span" sx={{ fontSize: '0.875rem', color: 'text.primary', minWidth: 0 }}>
          {body}
        </Typography>
      ) : null}
      {action ? (
        <Link
          component={action.to ? RouterLink : 'button'}
          to={action.to}
          onClick={action.onClick}
          underline="hover"
          sx={{
            ml: 'auto',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: dark ? 'primary.main' : 'primary.dark',
            whiteSpace: 'nowrap',
            background: 'none',
            border: 0,
            p: 0,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          {action.label} →
        </Link>
      ) : null}
    </Box>
  );
}
