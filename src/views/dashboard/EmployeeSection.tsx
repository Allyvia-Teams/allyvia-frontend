// material-ui
import Grid from '@mui/material/Grid';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { gridSpacing, mediumWidgetHeight, smallWidgetHeight } from 'store/constant';
// assets
import EmployeesTable from './EmployeesTable';
import { ErrorSkeleton } from 'ui-component/UISkeleton';

export const EmployeesSection = () => {
  const employeeWidgetsSm = {
    isLoading: false,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  // Just for testing
  let isError = false;
  return (
    <Grid size={12}>
      <MainCard title="Employees">
        {isError ? (
          <ErrorSkeleton height={mediumWidgetHeight} />
        ) : (
          <Grid container spacing={gridSpacing}>
            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
              <TotalIncomeDarkCard {...employeeWidgetsSm} value={'157h 27m'} title={'Hours Worked'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
              <TotalIncomeDarkCard {...employeeWidgetsSm} value={2} title={'Time Off Requests'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
              <TotalIncomeDarkCard {...employeeWidgetsSm} value={'$14,082.64'} title={'Cost of Scheduled Labor'} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 3 }}>
              <TotalIncomeDarkCard {...employeeWidgetsSm} value={427} title={'Hours Available'} />
            </Grid>
            <Grid size={12}>
              <EmployeesTable />
            </Grid>
          </Grid>
        )}
      </MainCard>
    </Grid>
  );
};
