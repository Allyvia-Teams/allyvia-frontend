import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { BrandTheme } from 'types/config';
import { parseBrandIdentity } from 'utils/brandIdentity';

/** Shared by the real app chrome and Brand Studio, including its collapsed preview. */
export default function BrandIdentity({
  brand,
  collapsed = false,
  name = 'Your store'
}: {
  brand: NonNullable<BrandTheme>;
  collapsed?: boolean;
  name?: string;
}) {
  const identity = parseBrandIdentity(brand.identity);
  const label = identity.name || name;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [brand.logoUrl]);
  const image = brand.logoUrl && !failed && identity.layout !== 'wordmark';
  const showText = !collapsed && (identity.layout !== 'logo' || !image);
  const size = collapsed ? Math.min(identity.size, 36) : identity.size;
  return (
    <Box
      aria-label={`${label} brand identity`}
      sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: collapsed ? 44 : 188, minWidth: 0, color: 'text.primary' }}
    >
      {(image || collapsed) && (
        <Box
          sx={{
            width: collapsed || identity.layout === 'lockup' ? size : 160,
            height: size,
            flexShrink: 0,
            overflow: 'hidden',
            borderRadius: `${identity.radius}px`,
            bgcolor: identity.background,
            p: `${identity.padding}px`,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {image ? (
            <Box
              component="img"
              src={brand.logoUrl!}
              alt={`${label} logo`}
              onError={() => setFailed(true)}
              sx={{ width: '100%', height: '100%', objectFit: identity.fit, transform: `scale(${identity.zoom})`, display: 'block' }}
            />
          ) : (
            <Typography sx={{ fontFamily: brand.headingFont || 'inherit', fontWeight: 600 }}>{label.slice(0, 1).toUpperCase()}</Typography>
          )}
        </Box>
      )}
      {showText && (
        <Box sx={{ minWidth: 0 }}>
          <Typography
            title={label}
            noWrap
            sx={{ fontFamily: brand.headingFont || 'inherit', fontSize: Math.min(22, size * 0.5), fontWeight: 600, lineHeight: 1.2 }}
          >
            {label}
          </Typography>
          {identity.tagline && (
            <Typography noWrap title={identity.tagline} sx={{ fontSize: 10, opacity: 0.65, mt: 0.25 }}>
              {identity.tagline}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
