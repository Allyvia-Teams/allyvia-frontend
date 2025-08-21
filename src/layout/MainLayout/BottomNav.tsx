import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// material-ui
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';

// assets
import { IconHome, IconReportMoney, IconUsersGroup, IconLifebuoy } from '@tabler/icons-react';

interface NavItem {
  label: string;
  value: string;
  to: string;
  icon: JSX.Element;
}

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const items: NavItem[] = useMemo(
    () => [
      { label: 'Dashboard', value: '/dashboard', to: '/dashboard', icon: <IconHome size={20} /> },
      { label: 'Finance', value: '/finance', to: '/finance', icon: <IconReportMoney size={20} /> },
      { label: 'Employees', value: '/employees', to: '/employees', icon: <IconUsersGroup size={20} /> },
      { label: 'Integrations', value: '/crm', to: '/crm', icon: <IconLifebuoy size={20} /> }
    ],
    []
  );

  const current = items.find((i) => location.pathname.startsWith(i.value))?.value ?? '/dashboard';

  return (
    <Paper sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1200 }} elevation={8} role="navigation" aria-label="Primary">
      <BottomNavigation
        showLabels
        value={current}
        onChange={(event, newValue) => {
          const match = items.find((i) => i.value === newValue);
          if (match) navigate(match.to);
        }}
      >
        {items.map((item) => (
          <BottomNavigationAction key={item.value} label={item.label} value={item.value} icon={item.icon} aria-label={item.label} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}


