import React, { useEffect } from 'react';
import { Box, Alert, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useDispatch, useSelector } from 'store';
import { fetchOverview } from 'store/slices/qbEntities';
import { getCompanyId } from 'utils/authStorage';
import { LoadingSkeleton } from 'ui-component/UISkeleton';

// Import bento components
import BentoContainer from './BentoContainer';
import BentoGridLayout, { gridAreas } from './BentoGridLayout';
import BentoTile from './tiles/BentoTile';

// Icons for tiles
import {
  Payment,
  ShoppingCart,
  AccountBalance,
  Store,
  AccountBalanceWallet,
  Receipt,
  AttachMoney,
  People,
  Inventory,
  MoneyOff,
  InfoOutlined,
  WarningAmberOutlined,
  TrendingUpOutlined,
  PaymentOutlined,
  Inventory2Outlined,
  MoneyOutlined
} from '@mui/icons-material';

interface QuickBooksOverviewProps {
  onEntityClick?: (entity: string) => void;
}

const QuickBooksOverview: React.FC<QuickBooksOverviewProps> = ({ onEntityClick }) => {
  const dispatch = useDispatch();
  const companyId = getCompanyId();

  const { data, loading, error } = useSelector((state) => state.qbEntities.overview);
  const { isAnySyncing, isWaitingForOverviewData, completedCount, totalEntities } = useSelector((state) => state.syncProgress);

  // Only fetch overview when NOT syncing and NOT waiting for data
  useEffect(() => {
    if (companyId && !isWaitingForOverviewData && !isAnySyncing) {
      dispatch(fetchOverview(companyId));
    }
  }, [dispatch, companyId, isWaitingForOverviewData, isAnySyncing]);

  // Refresh data every 5 minutes (only when not syncing)
  useEffect(() => {
    if (companyId && !isWaitingForOverviewData && !isAnySyncing) {
      const interval = setInterval(
        () => {
          dispatch(fetchOverview(companyId));
        },
        5 * 60 * 1000
      );

      return () => clearInterval(interval);
    }
  }, [dispatch, companyId, isWaitingForOverviewData, isAnySyncing]);

  if (loading && !data) {
    return (
      <Box sx={{ width: '100%' }}>
        <LoadingSkeleton height={400} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load QuickBooks overview: {error}
      </Alert>
    );
  }

  if (!data || !data.entities) {
    // If syncing, show skeleton instead of "no data" message
    if (isAnySyncing) {
      return (
        <Box sx={{ width: '100%' }}>
          <LoadingSkeleton height={400} />
        </Box>
      );
    }
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No QuickBooks data available. Please sync your data first.
      </Alert>
    );
  }

  const { entities, sync_status } = data;
  const isTileLoading = (isAnySyncing && completedCount < totalEntities) || isWaitingForOverviewData || loading;

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Bento Grid Container */}
      <BentoContainer sx={{ position: 'relative' }}>
        <BentoGridLayout>
          {/* Payments - Hero Wide */}
          <BentoTile
            variant="hero-wide"
            colorScheme="payments"
            title="Payments"
            icon={<AttachMoney />}
            gridArea={gridAreas.payments}
            glowEffect
            loading={isTileLoading}
            onClick={() => onEntityClick?.('payments')}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'inherit' }}>
                  {formatCurrency(entities.payments.total_received || 0)}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, color: 'inherit' }}>
                  Total Received
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'inherit' }}>
                    +{formatCurrency(entities.payments.todays_amount || 0)}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8, color: 'inherit' }}>
                    Today ({entities.payments.todays_count || 0})
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'inherit' }}>
                    {formatCurrency(entities.payments.week_amount || 0)}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8, color: 'inherit' }}>
                    This Week
                  </Typography>
                </Box>
              </Box>

              {/* Insight Alert */}
              {entities.payments.unapplied_amount > 0 && (
                <Box
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 1,
                    p: 1.5,
                    borderLeft: '3px solid rgba(255,255,255,0.8)'
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                    <InfoOutlined sx={{ fontSize: 16, mr: 0.5 }} />
                    {formatCurrency(entities.payments.unapplied_amount)} unapplied
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.9 }}>
                    {entities.payments.unapplied_count} payments need allocation
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.8 }}>
                  Avg payment: {formatCurrency(entities.payments.average_payment || 0)}
                </Typography>
              </Box>
            </Box>
          </BentoTile>

          {/* Invoices - Hero Tall */}
          <BentoTile
            variant="hero-tall"
            colorScheme="invoices"
            title="Invoices"
            icon={<Receipt />}
            gridArea={gridAreas.invoices}
            glowEffect
            loading={isTileLoading}
            onClick={() => onEntityClick?.('invoices')}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'inherit' }}>
                  {formatCurrency(entities.invoices.outstanding_balance || 0)}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, color: 'inherit' }}>
                  Outstanding Balance
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1, textAlign: 'center', p: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                  <Typography variant="h4" sx={{ color: 'inherit' }}>
                    {entities.invoices.unpaid_count || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'inherit' }}>
                    Unpaid
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center', p: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                  <Typography variant="h4" sx={{ color: 'inherit' }}>
                    {entities.invoices.overdue_count || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'inherit' }}>
                    Overdue
                  </Typography>
                </Box>
              </Box>

              {/* Alert for overdue invoices */}
              {entities.invoices.overdue_amount > 0 && (
                <Box
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 1,
                    p: 1.5,
                    borderLeft: '3px solid rgba(255,255,255,0.8)'
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                    <WarningAmberOutlined sx={{ fontSize: 16, mr: 0.5 }} />
                    {formatCurrency(entities.invoices.overdue_amount)} overdue
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.9 }}>
                    {entities.invoices.overdue_30days_count > 0 && `${entities.invoices.overdue_30days_count} over 30 days`}
                  </Typography>
                </Box>
              )}

              {/* Collection Efficiency */}
              <Box
                sx={{
                  p: 1,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 1
                }}
              >
                <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                  <TrendingUpOutlined sx={{ fontSize: 16, mr: 0.5 }} />
                  Collection Rate: {entities.invoices.collection_rate || 0}%
                </Typography>
                <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.8 }}>
                  {entities.invoices.paid_count} of {entities.invoices.total} paid
                </Typography>
              </Box>

              <Box sx={{ mt: 'auto' }}>
                <Typography variant="caption" sx={{ opacity: 0.7, color: 'inherit' }}>
                  Total invoices: {entities.invoices.total || 0}
                </Typography>
              </Box>
            </Box>
          </BentoTile>

          {/* Bills - Medium */}
          <BentoTile
            variant="medium"
            colorScheme="bills"
            title="Bills"
            icon={<MoneyOff />}
            gridArea={gridAreas.bills}
            loading={isTileLoading}
            onClick={() => onEntityClick?.('bills')}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'inherit' }}>
                  {entities.bills.total || 0} Total Bills
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, color: 'inherit' }}>
                  {entities.bills.unpaid_count || 0} Unpaid | {entities.bills.overdue_count || 0} Overdue
                </Typography>
              </Box>

              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'inherit' }}>
                  {formatCurrency(entities.bills.total_balance || 0)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, color: 'inherit' }}>
                  Total Outstanding
                </Typography>
              </Box>

              {/* Cash Flow Alert */}
              {entities.bills.due_this_week > 0 && (
                <Box
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 1,
                    p: 1,
                    borderLeft: '3px solid rgba(255,255,255,0.8)'
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                    <PaymentOutlined sx={{ fontSize: 16, mr: 0.5 }} />
                    {formatCurrency(entities.bills.due_this_week)} due this week
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.9 }}>
                    {entities.bills.due_this_week_count} bills need payment
                  </Typography>
                </Box>
              )}
            </Box>
          </BentoTile>

          {/* Customers - Small */}
          <BentoTile
            variant="small"
            colorScheme="customers"
            title="Customers"
            icon={<People />}
            gridArea={gridAreas.customers}
            loading={isTileLoading}
            onClick={() => onEntityClick?.('customers')}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'inherit' }}>
                  {entities.customers.total || 0}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, color: 'inherit' }}>
                  Total ({entities.customers.active_count || 0} active)
                </Typography>
              </Box>

              <Box>
                <Typography variant="body1" sx={{ fontWeight: 500, color: 'inherit' }}>
                  {formatCurrency(entities.customers.total_outstanding || 0)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, color: 'inherit' }}>
                  Outstanding
                </Typography>
              </Box>

              {entities.customers.average_balance > 0 && (
                <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.9 }}>
                    Avg balance: {formatCurrency(entities.customers.average_balance)}
                  </Typography>
                </Box>
              )}
            </Box>
          </BentoTile>

          {/* Accounts - Medium */}
          <BentoTile
            variant="medium"
            colorScheme="accounts"
            title="Accounts"
            icon={<AccountBalance />}
            gridArea={gridAreas.accounts}
            loading={isTileLoading}
            onClick={() => onEntityClick?.('accounts')}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: 'inherit' }}>
                    {entities.accounts.total || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8, color: 'inherit' }}>
                    Accounts
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'inherit' }}>
                    {formatCurrency(entities.accounts.total_balance || 0)}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8, color: 'inherit' }}>
                    Net Balance
                  </Typography>
                </Box>
              </Box>

              {/* Assets vs Liabilities Breakdown */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  p: 1,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 1
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.7 }}>
                    Assets
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 500 }}>
                    {formatCurrency(entities.accounts.total_assets || 0)}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: 'inherit', opacity: 0.7 }}>
                    Liabilities
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'inherit', fontWeight: 500 }}>
                    {formatCurrency(Math.abs(entities.accounts.total_liabilities || 0))}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </BentoTile>

          {/* Vendors - Mini */}
          <BentoTile
            variant="mini"
            colorScheme="vendors"
            title="Vendors"
            icon={<Store />}
            gridArea={gridAreas.vendors}
            loading={isTileLoading}
            onClick={() => onEntityClick?.('vendors')}
          >
            <Box>
              <Typography variant="h6" sx={{ color: 'inherit' }}>
                {entities.vendors.total || 0}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, color: 'inherit' }}>
                {formatCurrency(entities.vendors.total_payable || 0)} Payable
              </Typography>
            </Box>
          </BentoTile>

          {/* Items - Mini */}
          <BentoTile
            variant="mini"
            colorScheme="items"
            title="Items"
            icon={<Inventory />}
            gridArea={gridAreas.items}
            loading={isTileLoading}
            onClick={() => onEntityClick?.('items')}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="h6" sx={{ color: 'inherit', fontWeight: 600 }}>
                {entities.items.total || 0} Items
              </Typography>
              {entities.items.low_stock_count > 0 && (
                <Typography
                  variant="caption"
                  sx={{ color: 'inherit', opacity: 0.9, fontWeight: 500, display: 'flex', alignItems: 'center' }}
                >
                  <Inventory2Outlined sx={{ fontSize: 14, mr: 0.3 }} />
                  {entities.items.low_stock_count} low stock
                </Typography>
              )}
              {entities.items.total_value > 0 && (
                <Typography variant="caption" sx={{ opacity: 0.8, color: 'inherit' }}>
                  Value: {formatCurrency(entities.items.total_value)}
                </Typography>
              )}
            </Box>
          </BentoTile>

          {/* Bill Payments - Medium */}
          <BentoTile
            variant="medium"
            colorScheme="billpayments"
            title="Bill Payments"
            icon={<Payment />}
            gridArea={gridAreas.billpayments}
            loading={isTileLoading}
            onClick={() => onEntityClick?.('billpayments')}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'inherit' }}>
                {formatCurrency(entities.billpayments.mtd_total || 0)}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, color: 'inherit' }}>
                Month to Date
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, color: 'inherit' }}>
                {entities.billpayments.todays_count || 0} payments today
              </Typography>
            </Box>
          </BentoTile>

          {/* Vendor Credits - Small */}
          <BentoTile
            variant="small"
            colorScheme="vendorcredits"
            title="Vendor Credits"
            icon={<AccountBalanceWallet />}
            gridArea={gridAreas.vendorcredits}
            loading={isTileLoading}
            onClick={() => onEntityClick?.('vendorcredits')}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'inherit' }}>
                  {formatCurrency(entities.vendorcredits.total_available || 0)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, color: 'inherit' }}>
                  Available Credit
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ color: 'inherit' }}>
                  {entities.vendorcredits.open_count || 0} Open Credits
                </Typography>
              </Box>

              {entities.vendorcredits.unused_90days_count > 0 && (
                <Box
                  sx={{
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    borderRadius: 1,
                    p: 0.8,
                    borderLeft: '2px solid rgba(0,0,0,0.2)'
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                    <MoneyOutlined sx={{ fontSize: 14, mr: 0.3 }} />
                    {entities.vendorcredits.unused_90days_count} expiring soon
                  </Typography>
                </Box>
              )}
            </Box>
          </BentoTile>

          {/* Purchases - Strip */}
          <BentoTile
            variant="strip"
            colorScheme="purchases"
            title="Purchases"
            icon={<ShoppingCart />}
            gridArea={gridAreas.purchases}
            loading={isTileLoading}
            onClick={() => onEntityClick?.('purchases')}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'inherit' }}>
                  {entities.purchases.total || 0} Total
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, color: 'inherit' }}>
                  {formatCurrency(entities.purchases.total_amount || 0)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'inherit' }}>
                  {formatCurrency(entities.purchases.mtd_amount || 0)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, color: 'inherit' }}>
                  This Month
                </Typography>
              </Box>
            </Box>
          </BentoTile>
        </BentoGridLayout>
      </BentoContainer>

      {/* Sync Status - Below Bento Container */}
      {sync_status && (
        <Box
          sx={{
            mt: 2,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <Box
            sx={{
              backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.9),
              padding: '6px 16px',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)',
              border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              boxShadow: (theme) => theme.shadows[2]
            }}
          >
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
              Last synced: {sync_status.last_sync ? new Date(sync_status.last_sync).toLocaleString() : 'Never'}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default QuickBooksOverview;
