import { useEffect, useState } from 'react';

// assets — mark-only for collapsed chrome; full wordmark when the drawer is open
import logoMark from 'assets/images/allyvia_logo.svg';
import logoFull from 'assets/images/allyvia_logo.png';

// project imports
import useConfig from 'hooks/useConfig';

// ==============================|| LOGO ||============================== //
//
// Renders the company brand logo (brandTheme.logoUrl) when set, else the Allyvia logo. Falls back
// to Allyvia gracefully if the brand asset is missing or fails to load. Pre-login there is no
// company context (brandTheme is null), so the Allyvia default shows on auth screens.
// Collapsed = mark only; expanded = icon + "Allyvia" wordmark.

export default function Logo({ collapsed }: { collapsed: boolean }) {
  const { brandTheme } = useConfig();
  const brandLogo = brandTheme?.logoUrl || null;
  const [failed, setFailed] = useState(false);

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
          height: 40,
          maxHeight: 40,
          maxWidth: collapsed ? 44 : 160,
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
        height: collapsed ? 40 : 36,
        width: 'auto',
        maxWidth: collapsed ? 44 : 168,
        objectFit: 'contain',
        display: 'block',
        transition: 'max-width 0.3s ease-in-out, height 0.3s ease-in-out',
        marginLeft: collapsed ? 0 : 8
      }}
    />
  );
}
