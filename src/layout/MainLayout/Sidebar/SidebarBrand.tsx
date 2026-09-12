import { useEffect, useState } from 'react';

// material-ui
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';

// icons
import { IconChevronsLeft, IconChevronsRight } from '@tabler/icons-react';

// project imports
import { DASHBOARD_PATH } from 'config';
import useConfig from 'hooks/useConfig';
import { useSelector } from 'store';
import { sidebarHeaderHeight } from 'store/constant';
import { parseBrandIdentity } from 'utils/brandIdentity';

// ==============================|| SIDEBAR - BRAND HEADER ||============================== //
// Design handoff 1.6: a 64px header with a 30px, 8px-radius monogram on
// primary.main and the merchant wordmark at 14px in the merchant heading font,
// clipped with an ellipsis. The logo must fit its box. A configured brand logo
// takes the monogram's box; the wordmark stays text so it always fits.

export default function SidebarBrand({ collapsed, onToggle }: { collapsed: boolean; onToggle?: () => void }) {
  const theme = useTheme();
  const { brandTheme } = useConfig();
  const companyName = useSelector((state) => state.auth?.currentRole?.company_name) || 'Your store';
  const identity = brandTheme ? parseBrandIdentity(brandTheme.identity) : null;
  const label = identity?.name || companyName;
  const headingFont = brandTheme?.headingFont || theme.typography.h4.fontFamily;
  // A configured logo that fails to load falls back to the monogram rather than the
  // browser's broken-image glyph (same rule as BrandIdentity).
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => setLogoFailed(false), [brandTheme?.logoUrl]);
  const logoUrl = brandTheme?.logoUrl && !logoFailed ? brandTheme.logoUrl : null;

  const monogram = (
    <Box
      sx={{
        width: 30,
        height: 30,
        borderRadius: '8px',
        bgcolor: logoUrl ? 'background.paper' : 'primary.main',
        color: 'primary.contrastText',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        fontFamily: headingFont,
        fontSize: '1rem',
        fontWeight: 700,
        lineHeight: 1
      }}
    >
      {logoUrl ? (
        <Box
          component="img"
          src={logoUrl}
          alt={`${label} logo`}
          onError={() => setLogoFailed(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      ) : (
        label.trim().charAt(0).toUpperCase()
      )}
    </Box>
  );

  return (
    <Box
      sx={{
        height: sidebarHeaderHeight,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        px: collapsed ? 0 : 2,
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Link
        component={RouterLink}
        to={DASHBOARD_PATH}
        aria-label={`${label} — go to dashboard`}
        underline="none"
        sx={{ display: 'flex', minWidth: 0, flex: collapsed ? 0 : 1, alignItems: 'center', gap: '10px', color: 'inherit' }}
      >
        {monogram}
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography
              title={label}
              noWrap
              sx={{
                fontFamily: headingFont,
                fontSize: '0.875rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                lineHeight: 1.2,
                color: 'text.dark'
              }}
            >
              {label}
            </Typography>
            <Typography sx={{ fontSize: '0.65625rem', color: 'text.disabled', letterSpacing: '0.04em', lineHeight: 1.3 }}>
              Allyvia OS
            </Typography>
          </Box>
        )}
      </Link>
      {onToggle && !collapsed ? (
        <IconButton
          size="small"
          onClick={onToggle}
          aria-label="Collapse sidebar"
          aria-pressed={!collapsed}
          sx={{ ml: 'auto', color: 'text.disabled', flexShrink: 0 }}
        >
          <IconChevronsLeft size={18} stroke={1.75} />
        </IconButton>
      ) : null}
      {onToggle && collapsed ? (
        <IconButton
          size="small"
          onClick={onToggle}
          aria-label="Expand sidebar"
          sx={{ position: 'absolute', right: 4, top: sidebarHeaderHeight + 4, color: 'text.disabled' }}
        >
          <IconChevronsRight size={16} stroke={1.75} />
        </IconButton>
      ) : null}
    </Box>
  );
}
