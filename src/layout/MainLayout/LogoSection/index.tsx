import { useSelector } from 'store';
import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Link from '@mui/material/Link';

// project imports
import { DASHBOARD_PATH } from 'config';
import Logo from 'ui-component/Logo';

// ==============================|| MAIN LOGO ||============================== //

export default function LogoSection({ collapsed }: { collapsed: boolean }) {
  const name = useSelector((state) => state.auth?.currentRole?.company_name) || 'Your store';
  return (
    <Link component={RouterLink} to={DASHBOARD_PATH} aria-label="theme-logo">
      <Logo collapsed={collapsed} name={name} />
    </Link>
  );
}
