import MainCard from 'ui-component/cards/MainCard';
import ConnectToQuickBooks from './ConnectToQuickBooks';
import { ErrorSkeleton } from 'ui-component/UISkeleton';
import { Grid } from '@mui/material';
import { gridSpacing, mediumWidgetHeight } from 'store/constant';
import QBWidget from './QBWidget';

type QuickBooksSectionProps = {
  isLoading: boolean;
  isError: boolean;
  hasDataSource: boolean;
};

export function QuickBooksSection({ isLoading, isError, hasDataSource }: QuickBooksSectionProps) {
  return (
    <MainCard title="QuickBooks Pro" sx={{ width: '100%' }}>
      {!hasDataSource ? (
        <ConnectToQuickBooks />
      ) : isError ? (
        <ErrorSkeleton height={mediumWidgetHeight} />
      ) : (
        <Grid container spacing={gridSpacing}>
          <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
            <QBWidget title="Daily Profit" widgetTheme="gold" isLoading={isLoading} value={'$10,500'} sub="+3%" />
          </Grid>
          <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
            <QBWidget title="Daily Revenue" isLoading={isLoading} value={'$15,500'} sub="+3%" />
          </Grid>
          <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
            <QBWidget title="Pending Invoices" isLoading={isLoading} value={'200'} sub="+3%" />
          </Grid>
          <Grid size={{ lg: 3, md: 3, sm: 6, xs: 12 }}>
            <QBWidget title="Sales Volume" isLoading={isLoading} value={'300'} sub="+3%" />
          </Grid>
        </Grid>
      )}
    </MainCard>
  );
}
