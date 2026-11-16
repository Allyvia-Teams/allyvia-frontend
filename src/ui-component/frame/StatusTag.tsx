// material-ui
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme } from '@mui/material/styles';

// ==============================|| FRAME - STATUS TAG ||============================== //
// The small pill beside a figure's label ("Still importing", "Estimated", "Partial"),
// with the reason on hover and on keyboard focus. Theme palette colours only.

export interface StatusTagProps {
  label: string;
  tooltip: string;
  tone?: 'info' | 'warning';
}

export default function StatusTag({ label, tooltip, tone = 'info' }: StatusTagProps) {
  const theme = useTheme();
  const palette = theme.palette[tone];
  return (
    <Tooltip title={tooltip} placement="top" arrow describeChild>
      <Box
        component="span"
        tabIndex={tooltip ? 0 : undefined}
        aria-label={tooltip ? `${label}: ${tooltip}` : label}
        sx={{
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          fontSize: '0.6875rem',
          fontWeight: 600,
          lineHeight: 1.4,
          px: '6px',
          py: '1px',
          borderRadius: '6px',
          bgcolor: alpha(palette.main, 0.12),
          color: theme.palette.mode === 'dark' ? palette.light : palette.dark,
          whiteSpace: 'nowrap',
          cursor: 'help',
          '&:focus-visible': { outline: `2px solid ${palette.main}`, outlineOffset: '1px' }
        }}
      >
        {label}
      </Box>
    </Tooltip>
  );
}
