import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { gridSpacing } from 'store/constant';
import QuickBooksIcon from 'assets/images/icons/quickbooks_logo.png';
import IntuitIcon from 'assets/images/icons/intuit_logo.png';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import { updateQueryParam } from 'utils/url-helpers';
import { fetcher } from 'utils/axios';
import { getCompanyId, setQBUrlAndState } from 'utils/authStorage';
import { COLORS } from 'styles/colors';

// assets

const CALLBACK_URL = import.meta.env.VITE_APP_QB_CALLBACK_URL;

export default function ConnectToQuickBooks() {
  const handleClick = async () => {
    const companyId = getCompanyId();
    if (!companyId) {
      console.error('Missing company_id');
      return;
    }

    try {
      const { auth_url, state } = await fetcher(`/quickbooks/redirect/?company_id=${companyId}`);
      setQBUrlAndState(auth_url, state);

      const targetUrl = updateQueryParam(auth_url, 'redirect_uri', CALLBACK_URL);

      window.location.href = targetUrl;
    } catch (err) {
      console.error('Error fetching QuickBooks URL', err);
    }
  };

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Card>
          <CardContent>
            <Stack direction="column" alignItems="center" spacing={3}>
              <Stack direction="row" spacing={2} alignItems="center">
                <img src={IntuitIcon} alt="Intuit" height={25} />
                <img src={QuickBooksIcon} alt="QuickBooks" height={40} />
              </Stack>
              <Typography sx={{ textAlign: 'center' }} variant="h3">
                Connect Allyvia to your QuickBooks account
              </Typography>
              <Button
                onClick={handleClick}
                variant="contained"
                color="primary"
                size="large"
                sx={{ bgcolor: COLORS.qbGreen, color: COLORS.white }}
              >
                Connect
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
