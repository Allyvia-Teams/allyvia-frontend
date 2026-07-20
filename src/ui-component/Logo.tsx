import { useEffect, useState } from 'react';

// assets
import logo from 'assets/images/allyvia_logo.png';
import collapsedLogo from 'assets/images/allyvia_icon.png';

// project imports
import useConfig from 'hooks/useConfig';

// ==============================|| LOGO ||============================== //
//
// Renders the company brand logo (brandTheme.logoUrl) when set, else the Allyvia logo. Falls back
// to Allyvia gracefully if the brand asset is missing or fails to load. Pre-login there is no
// company context (brandTheme is null), so the Allyvia default shows on auth screens.

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
          height: 48,
          maxHeight: 48,
          maxWidth: collapsed ? 44 : 160,
          objectFit: 'contain',
          transition: 'margin-left 0.3s ease-in-out',
          marginLeft: collapsed ? '-16px' : '8px'
        }}
      />
    );
  }

  return (
    <img
      src={collapsed ? collapsedLogo : logo}
      alt="Allyvia"
      height="48"
      style={{ transition: 'margin-left 0.3s ease-in-out', marginLeft: collapsed ? '-16px' : '8px' }}
    />
  );
}
