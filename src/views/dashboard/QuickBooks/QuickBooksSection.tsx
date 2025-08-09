import MainCard from 'ui-component/cards/MainCard';
import ConnectToQuickBooks from './ConnectToQuickBooks';
import { ErrorSkeleton } from 'ui-component/UISkeleton';
import { Grid } from '@mui/material';
import { gridSpacing, mediumWidgetHeight } from 'store/constant';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from 'utils/axios';
import { Company } from 'types/entities';
import QBWidget from './QBWidget';
import { setCompanyId } from 'utils/authStorage';

export function QuickBooksSection() {
  const connectedCompany = (data: Company[]) => {
    const connected = data.filter((d: Company) => d.is_connected_to_quickbooks)[0];
    setCompanyId(connected.id);
    return connected;
  };

  const { isLoading, isError, data } = useQuery({
    queryKey: ['company'],
    queryFn: () => fetcher('/company/'),
    select: connectedCompany
  });

  return (
    <MainCard title="QuickBooks Pro" sx={{ width: '100%' }}>
      {!isLoading && !data?.is_qb_access_token_valid ? (
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
