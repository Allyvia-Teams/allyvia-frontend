import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { gridSpacing } from "store/constant";
import QuickBooksIcon from 'assets/images/icons/quickbooks_logo.png';
import IntuitIcon from 'assets/images/icons/intuit_logo.png';
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";

// assets

export default function ConnectToQuickBooks() {
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
                <Typography sx={{ textAlign: "center" }} variant="h3">Connect Allyvia to your QuickBooks account</Typography>
                <Button variant="contained" color="primary" size="large" sx={{ bgcolor: "#2ca01c", color: "white" }}>Connect</Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}