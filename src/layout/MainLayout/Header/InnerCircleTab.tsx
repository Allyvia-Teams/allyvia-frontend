import { useLocation, useNavigate } from 'react-router-dom';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

// assets
import { IconCrown } from '@tabler/icons-react';

// ==============================|| HEADER - INNER CIRCLE TAB ||============================== //

// Prominent branded entry point for Inner Circle, centered in the header.
// Accent + label font key off the theme, which is already brand-derived
// (brand primary -> palette.primary, brand heading font -> typography.h4),
// so the tab renders fully styled with or without a configured brand.
export default function InnerCircleTab() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));

  const active = location.pathname.startsWith('/inner-circle');
  const primary = theme.palette.primary.main;

  const tab = (
    <ButtonBase
      onClick={() => navigate('/inner-circle')}
      aria-label="Inner Circle"
      aria-current={active ? 'page' : undefined}
      sx={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.25,
        px: downMD ? 1.25 : 2.5,
        py: 0.75,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: alpha(primary, active ? 0.45 : 0.24),
        bgcolor: alpha(primary, active ? 0.16 : 0.08),
        color: active ? primary : 'text.primary',
        transition: 'all .2s ease-in-out',
        '&:hover': { bgcolor: alpha(primary, active ? 0.2 : 0.12) }
      }}
    >
      <IconCrown size={22} stroke={1.8} color={primary} />
      {!downMD && (
        <Typography
          variant="subtitle2"
          sx={{
            fontFamily: theme.typography.h4.fontFamily,
            fontWeight: 600,
            lineHeight: 1.1,
            color: 'inherit',
            whiteSpace: 'nowrap'
          }}
        >
          Inner Circle
        </Typography>
      )}
    </ButtonBase>
  );

  return downMD ? <Tooltip title="Inner Circle">{tab}</Tooltip> : tab;
}
