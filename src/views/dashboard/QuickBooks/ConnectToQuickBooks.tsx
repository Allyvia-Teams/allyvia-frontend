import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { gridSpacing } from 'store/constant';
import IntuitIcon from 'assets/images/icons/intuit_logo.png';
import SquareIcon from 'assets/images/icons/Square,_Inc._logo.svg.png';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../../../styles/colors';

// assets

export default function ConnectToQuickBooks() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/integrations');
  };

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Card>
          <CardContent>
            <Stack direction="column" alignItems="center" spacing={3}>
              <Stack direction="row" spacing={4} alignItems="center">
                <img src={SquareIcon} alt="Square" height={30} />
                <img src={IntuitIcon} alt="Intuit" height={30} />
               
              </Stack>
              <Typography sx={{ textAlign: 'center' }} variant="h3">
                Connect Allyvia to your current system
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
