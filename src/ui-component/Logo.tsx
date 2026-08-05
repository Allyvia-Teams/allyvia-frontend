import { useEffect, useState } from 'react';

// assets — mark-only for collapsed chrome; full wordmark when the drawer is open
import logoMark from 'assets/images/allyvia_logo.svg';
import logoFull from 'assets/images/allyvia_logo.png';

// project imports
import useConfig from 'hooks/useConfig';

// ==============================|| LOGO ||============================== //
//
// Renders the company brand logo (brandTheme.logoUrl) when set, else the Allyvia logo. Falls back
// to Allyvia gracefully if the brand asset is missing or fails to load. Pass ignoreBrand on auth
// screens so a stale company logo never replaces the Allyvia mark. Collapsed = mark only (native
// #309DF7 accents); expanded = icon + "Allyvia" wordmark.

type LogoProps = {
  collapsed: boolean;
  /** Skip company brandTheme.logoUrl and always render the Allyvia asset (auth screens). */
  ignoreBrand?: boolean;
  /** Override rendered height (defaults: 40 collapsed / 36 expanded). */
  height?: number;
};

export default function Logo({ collapsed, ignoreBrand = false, height }: LogoProps) {
  const { brandTheme } = useConfig();
  const brandLogo = !ignoreBrand ? brandTheme?.logoUrl || null : null;
  const [failed, setFailed] = useState(false);
  const resolvedHeight = height ?? (collapsed ? 40 : 36);

  // Reset the error flag if the brand logo URL changes (e.g. admin applies a new logo live).
  useEffect(() => {
    setFailed(false);
  }, [brandLogo]);

  if (brandLogo && !failed) {
    return (
      <img
        src={brandLogo}
        alt="Company logo"
        onError={() => setFailed(true)}
        style={{
          height: resolvedHeight,
          maxHeight: resolvedHeight,
          maxWidth: collapsed ? resolvedHeight + 4 : 160,
          objectFit: 'contain',
          transition: 'max-width 0.3s ease-in-out',
          marginLeft: collapsed ? 0 : 8
        }}
      />
    );
  }

  return (
    <img
      src={collapsed ? logoMark : logoFull}
      alt="Allyvia"
      style={{
        height: resolvedHeight,
        width: 'auto',
        maxWidth: collapsed ? resolvedHeight + 4 : 168,
        objectFit: 'contain',
        display: 'block',
        transition: 'max-width 0.3s ease-in-out, height 0.3s ease-in-out',
        marginLeft: collapsed ? 0 : 8
      }}
    />
  );
}
