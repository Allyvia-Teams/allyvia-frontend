import { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, Button, Stack } from '@mui/material';
import { useSelector, useDispatch } from 'store';
import {
  fetchSupplierRisk,
  generateSupplierRisk,
  fetchOverstock,
  generateOverstock,
  fetchSalesTrends,
  generateSalesTrends
} from 'store/slices/analytics';
import CompanyProfileCard from './components/CompanyProfileCard';
import SupplierRiskCard from './components/SupplierRiskCard';
import OverstockCard from './components/OverstockCard';
import SalesTrendsCard from './components/SalesTrendsCard';
import InsightCardLandscapeSkeleton from 'ui-component/insights/InsightCardLandscapeSkeleton';
import MainCard from 'ui-component/cards/MainCard';
import { INSIGHT_CATEGORIES, ALL_TAB_VALUE, InsightCategory } from './constants';

export default function InsightsDashboard() {
  const dispatch = useDispatch();
  const qbStatus = useSelector((state) => state.integrations.quickbooks.connection.status);
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB_VALUE);

  const profile = useSelector((state) => state.analytics.companyProfile);

  const supplierRisk = useSelector((state) => state.analytics.supplierRisk);
  const supplierRiskLoading = useSelector((state) => state.analytics.supplierRiskLoading);
  const supplierRiskError = useSelector((state) => state.analytics.supplierRiskError);

  const overstock = useSelector((state) => state.analytics.overstock);
  const overstockLoading = useSelector((state) => state.analytics.overstockLoading);
  const overstockError = useSelector((state) => state.analytics.overstockError);

  const salesTrends = useSelector((state) => state.analytics.salesTrends);
  const salesTrendsLoading = useSelector((state) => state.analytics.salesTrendsLoading);
  const salesTrendsError = useSelector((state) => state.analytics.salesTrendsError);

  useEffect(() => {
    if (qbStatus === 'connected' && profile) {
      if (!supplierRisk && !supplierRiskLoading && !supplierRiskError) {
        dispatch(fetchSupplierRisk());
      }
      if (!overstock && !overstockLoading && !overstockError) {
        dispatch(fetchOverstock());
      }
      if (!salesTrends && !salesTrendsLoading && !salesTrendsError) {
        dispatch(fetchSalesTrends());
      }
    }
  }, [
    qbStatus,
    profile,
    supplierRisk,
    supplierRiskLoading,
    supplierRiskError,
    overstock,
    overstockLoading,
    overstockError,
    salesTrends,
    salesTrendsLoading,
    salesTrendsError,
    dispatch
  ]);

  const showInsightsContent = qbStatus === 'connected' && !!profile;
  const is404 = supplierRiskError?.includes('404') || supplierRiskError?.toLowerCase().includes('not found');
  const overstockIs404 = overstockError?.includes('404') || overstockError?.toLowerCase().includes('not found');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const shouldShowInsight = (categoryId: InsightCategory) => {
    if (activeTab === ALL_TAB_VALUE) return true;
    return activeTab === categoryId;
  };

  const renderSupplierRiskInsight = () => {
    if (!shouldShowInsight('supplier-risk')) return null;

    if (supplierRiskLoading) {
      return <InsightCardLandscapeSkeleton />;
    }

    if (is404) {
      return (
        <MainCard title="Supplier Risk Concentration">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              No analysis found. Generate insights to see supplier risk concentration.
            </Typography>
            <Button
              variant="contained"
              onClick={() => dispatch(generateSupplierRisk())}
              disabled={supplierRiskLoading}
              sx={{ color: 'white' }}
            >
              {supplierRiskLoading ? 'Generating...' : 'Generate Insights'}
            </Button>
          </Box>
        </MainCard>
      );
    }

    if (supplierRisk) {
      return <SupplierRiskCard data={supplierRisk} />;
    }

    return null;
  };

  const renderOverstockInsight = () => {
    if (!shouldShowInsight('overstock')) return null;

    if (overstockLoading) {
      return <InsightCardLandscapeSkeleton />;
    }

    if (overstockIs404) {
      return (
        <MainCard title="Overstock Detection">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              No analysis found. Generate insights to detect slow-moving inventory.
            </Typography>
            <Button variant="contained" onClick={() => dispatch(generateOverstock())} disabled={overstockLoading} sx={{ color: 'white' }}>
              {overstockLoading ? 'Generating...' : 'Generate Insights'}
            </Button>
          </Box>
        </MainCard>
      );
    }

    if (overstock) {
      return <OverstockCard data={overstock} />;
    }

    return null;
  };

  const renderSalesTrendsInsight = () => {
    if (!shouldShowInsight('sales-trends')) return null;

    if (salesTrendsLoading) {
      return <InsightCardLandscapeSkeleton />;
    }

    const is404 = salesTrendsError?.includes('404') || salesTrendsError?.toLowerCase().includes('not found');

    if (is404) {
      return (
        <MainCard title="Sales Forecasting">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              No analysis found. Generate insights to see sales trends and predictions.
            </Typography>
            <Button
              variant="contained"
              onClick={() => dispatch(generateSalesTrends())}
              disabled={salesTrendsLoading}
              sx={{ color: 'white' }}
            >
              {salesTrendsLoading ? 'Generating...' : 'Generate Insights'}
            </Button>
          </Box>
        </MainCard>
      );
    }

    if (salesTrends && salesTrends.status === 'INSUFFICIENT_DATA') {
      return (
        <MainCard title="Sales Forecasting">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary">
              {salesTrends.message || 'There are not enough records to make predictions'}
            </Typography>
          </Box>
        </MainCard>
      );
    }

    if (salesTrends && salesTrends.status === 'NO_DATA') {
      return (
        <MainCard title="Sales Forecasting">
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary">
              {salesTrends.message || 'No sales data available yet'}
            </Typography>
          </Box>
        </MainCard>
      );
    }

    if (salesTrends && salesTrends.status === 'SUCCESS') {
      return <SalesTrendsCard data={salesTrends} />;
    }

    return null;
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: '100%', md: '1400px', lg: '1600px', xl: '1920px' },
        mx: 'auto',
        px: 3,
        py: 3
      }}
    >
      <CompanyProfileCard />

      {showInsightsContent && (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
              <Tab label="All" value={ALL_TAB_VALUE} />
              {INSIGHT_CATEGORIES.map((category) => (
                <Tab key={category.id} label={category.label} value={category.id} />
              ))}
            </Tabs>
          </Box>

          <Stack spacing={3}>
            {renderSupplierRiskInsight()}
            {renderOverstockInsight()}
            {renderSalesTrendsInsight()}
          </Stack>
        </>
      )}
    </Box>
  );
}
