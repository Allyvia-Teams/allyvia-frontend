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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: downMD ? 0 : 1.25,
        minWidth: downMD ? 'auto' : 200,
        height: 52,
        px: downMD ? 1.5 : 3,
        borderRadius: 2.5,
        border: '1.5px solid',
        borderColor: alpha(primary, active ? 0.6 : 0.35),
        bgcolor: alpha(primary, active ? 0.22 : 0.12),
        color: active ? primary : 'text.primary',
        boxShadow: active ? `0 2px 10px 0 ${alpha(primary, 0.25)}` : 'none',
        transition: 'all .2s ease-in-out',
        '&:hover': { bgcolor: alpha(primary, active ? 0.28 : 0.18), borderColor: alpha(primary, active ? 0.7 : 0.5) }
      }}
    >
      <IconCrown size={28} stroke={1.9} color={primary} />
      {!downMD && (
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: theme.typography.h4.fontFamily,
            fontWeight: 700,
            fontSize: '1.05rem',
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
