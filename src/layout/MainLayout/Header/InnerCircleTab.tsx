import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

// assets
import { IconCrown } from '@tabler/icons-react';

// ==============================|| HEADER - INNER CIRCLE TOGGLE ||============================== //

// Compact modern toggle to enter/leave Inner Circle. Checked state mirrors the
// route; turning off returns to the last non-IC page (dashboard fallback).
export default function InnerCircleTab() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));

  const active = location.pathname.startsWith('/inner-circle');
  const primary = theme.palette.primary.main;
  const lastNonIcPath = useRef('/');

  useEffect(() => {
    if (!active) {
      lastNonIcPath.current = `${location.pathname}${location.search}` || '/';
    }
  }, [active, location.pathname, location.search]);

  const handleToggle = () => {
    if (active) {
      navigate(lastNonIcPath.current || '/');
    } else {
      navigate('/inner-circle');
    }
  };

  const control = (
    <Box
      component="label"
      sx={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: downMD ? 0.5 : 1,
        height: 36,
        pl: downMD ? 0.75 : 1.25,
        pr: 0.5,
        borderRadius: 999,
        bgcolor: active ? alpha(primary, 0.12) : alpha(theme.palette.text.primary, 0.04),
        border: '1px solid',
        borderColor: active ? alpha(primary, 0.28) : alpha(theme.palette.divider, 0.9),
        cursor: 'pointer',
        transition: 'background-color .2s ease, border-color .2s ease',
        '&:hover': {
          bgcolor: active ? alpha(primary, 0.16) : alpha(theme.palette.text.primary, 0.07)
        }
      }}
    >
      <IconCrown size={18} stroke={1.9} color={active ? primary : theme.palette.text.secondary} />
      {!downMD && (
        <Typography
          variant="body2"
          sx={{
            fontFamily: theme.typography.h4.fontFamily,
            fontWeight: 600,
            fontSize: '0.8125rem',
            lineHeight: 1,
            color: active ? primary : 'text.secondary',
            whiteSpace: 'nowrap',
            userSelect: 'none'
          }}
        >
          Inner Circle
        </Typography>
      )}
      <Switch
        checked={active}
        onChange={handleToggle}
        size="small"
        inputProps={{
          'aria-label': 'Inner Circle',
          'aria-checked': active
        }}
        sx={{
          width: 36,
          height: 22,
          p: 0,
          ml: downMD ? 0.25 : 0.5,
          '& .MuiSwitch-switchBase': {
            p: 0.25,
            transitionDuration: '200ms',
            '&.Mui-checked': {
              transform: 'translateX(14px)',
              color: '#fff',
              '& + .MuiSwitch-track': {
                bgcolor: primary,
                opacity: 1,
                border: 0
              }
            }
          },
          '& .MuiSwitch-thumb': {
            width: 18,
            height: 18,
            boxShadow: '0 1px 2px rgba(0,0,0,0.18)'
          },
          '& .MuiSwitch-track': {
            borderRadius: 11,
            bgcolor: alpha(theme.palette.text.primary, 0.18),
            opacity: 1
          }
        }}
      />
    </Box>
  );

  return downMD ? <Tooltip title="Inner Circle">{control}</Tooltip> : control;
}
