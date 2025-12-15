import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Chip,
  Alert,
  Divider,
  IconButton,
  Paper,
  CircularProgress,
  Grid
} from '@mui/material';
import { IconX, IconCreditCard, IconCheck, IconX as IconXTabler, IconAlertCircle, IconRefresh, IconShield } from '@tabler/icons-react';
import { useSelector, useDispatch } from 'store';
import { useNavigate } from 'react-router-dom';
import {
  fetchSubscriptionStatus,
  cancelSubscription,
  updateSubscription,
  clearCancelSuccess,
  clearUpdateSuccess
} from 'store/slices/subscription';
import { SUBSCRIPTION_PLANS, getPlanByName, getModuleDisplayName } from 'config/subscription-plans';

interface ManageSubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ManageSubscriptionModal({ open, onClose }: ManageSubscriptionModalProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const subscriptionState = useSelector((s) => s.subscription);
  const { status, statusLoading, cancelLoading, cancelSuccess, cancelError, updateLoading, updateSuccess, updateError } = subscriptionState;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (subscriptionStatus: string | null) => {
    switch (subscriptionStatus?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'trialing':
        return 'info';
      case 'past_due':
        return 'warning';
      case 'canceled':
        return 'error';
      default:
        return 'default';
    }
  };

  const isSubscriptionActive = status?.subscription_status === 'active' || status?.subscription_status === 'trialing';
  const isSubscriptionCanceled = status?.subscription_status === 'canceled';
  const willCancelAtPeriodEnd = status?.subscription_cancel_at !== null;

  const handleCancelSubscription = async () => {
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }

    try {
      await dispatch(cancelSubscription()).unwrap();
      setConfirmCancel(false);
      dispatch(fetchSubscriptionStatus());
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      setConfirmCancel(false);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      await dispatch(updateSubscription({ cancel_at_period_end: false })).unwrap();
      dispatch(fetchSubscriptionStatus());
    } catch (error) {
      console.error('Failed to resume subscription:', error);
    }
  };

  const handleChangePlan = () => {
    navigate('/payment-plan');
    onClose();
  };

  const handleRefreshStatus = () => {
    dispatch(fetchSubscriptionStatus());
  };

  const handleClose = () => {
    setConfirmCancel(false);
    dispatch(clearCancelSuccess());
    dispatch(clearUpdateSuccess());
    onClose();
  };

  // Refresh subscription status when modal opens
  React.useEffect(() => {
    if (open) {
      dispatch(fetchSubscriptionStatus());
    }
  }, [open, dispatch]);

  // Clear success messages after 5 seconds
  React.useEffect(() => {
    if (cancelSuccess) {
      const timer = setTimeout(() => {
        dispatch(clearCancelSuccess());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [cancelSuccess, dispatch]);

  React.useEffect(() => {
    if (updateSuccess) {
      const timer = setTimeout(() => {
        dispatch(clearUpdateSuccess());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [updateSuccess, dispatch]);

  const currentPlan = status?.subscription_plan ? getPlanByName(status.subscription_plan) : null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconCreditCard size={24} />
            <Typography variant="h5" fontWeight={600}>
              Manage Subscription
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <IconX size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Success/Error Messages */}
        {cancelSuccess && (
          <Alert severity="success" onClose={() => dispatch(clearCancelSuccess())} sx={{ mb: 2 }}>
            Subscription will be canceled at the end of the current billing period.
          </Alert>
        )}
        {cancelError && (
          <Alert severity="error" onClose={() => dispatch(clearCancelSuccess())} sx={{ mb: 2 }}>
            {cancelError}
          </Alert>
        )}
        {updateSuccess && (
          <Alert severity="success" onClose={() => dispatch(clearUpdateSuccess())} sx={{ mb: 2 }}>
            Subscription updated successfully.
          </Alert>
        )}
        {updateError && (
          <Alert severity="error" onClose={() => dispatch(clearUpdateSuccess())} sx={{ mb: 2 }}>
            {updateError}
          </Alert>
        )}

        {statusLoading && !status ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Current Plan Status */}
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Current Plan
                  </Typography>
                  <Button size="small" startIcon={<IconRefresh size={16} />} onClick={handleRefreshStatus} disabled={statusLoading}>
                    Refresh
                  </Button>
                </Box>

                {status?.status === 'Active' && status?.subscription_plan ? (
                  <Stack spacing={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                      <Chip
                        label={status.subscription_plan}
                        color="primary"
                        sx={{ fontSize: '1rem', fontWeight: 600, px: 1 }}
                        size="medium"
                      />
                      <Chip
                        label={status.subscription_status?.toUpperCase() || 'UNKNOWN'}
                        color={getStatusColor(status.subscription_status ?? null) as any}
                        size="small"
                      />
                      {willCancelAtPeriodEnd && (
                        <Chip label="Canceled at period end" color="warning" size="small" icon={<IconAlertCircle size={16} />} />
                      )}
                    </Stack>

                    {status.subscription_status === 'trialing' && status.trial_end_date && (
                      <Alert severity="info">Trial ends on {formatDate(status.trial_end_date)}</Alert>
                    )}

                    {willCancelAtPeriodEnd && status.subscription_end_date && (
                      <Alert severity="warning">Subscription will end on {formatDate(status.subscription_end_date)}</Alert>
                    )}

                    {/* Current Plan Module Access */}
                    {currentPlan && (
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                          Available Modules ({currentPlan.availableModules.length}):
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {currentPlan.availableModules.map((moduleKey) => (
                            <Chip
                              key={moduleKey}
                              label={getModuleDisplayName(moduleKey)}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Alert severity="info" icon={<IconAlertCircle />}>
                    No active subscription. Subscribe to a plan to get started.
                  </Alert>
                )}
              </Stack>
            </Paper>

            {/* Subscription Details */}
            {status?.subscription_id && (
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Subscription Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Subscription ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                      {status.subscription_id}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Status
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {status.subscription_status || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Start Date
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {formatDate(status.subscription_start_date ?? null)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {status.subscription_end_date ? 'End Date' : 'Renewal Date'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {formatDate(status.subscription_end_date ?? status.subscription_cancel_at ?? null)}
                    </Typography>
                  </Grid>
                  {status.trial_end_date && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Trial End Date
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {formatDate(status.trial_end_date)}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}

            {/* Available Plans */}
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Available Plans
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                  Subscription Hierarchy:
                </Typography>
                <Typography variant="body2" component="div">
                  <strong>1. Subscription Level</strong> → Determines which modules are available to your COMPANY
                  <br />
                  <strong>2. Admin Level</strong> → Can grant/revoke access to modules for USERS (within subscription limits)
                  <br />
                  <strong>3. User Level</strong> → Can only access modules granted by admin based on subscription limits
                </Typography>
              </Alert>

              <Stack spacing={2}>
                {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
                  const isCurrentPlan =
                    status?.subscription_plan?.toLowerCase().includes(plan.name.toLowerCase()) ||
                    status?.subscription_plan?.toLowerCase().includes(plan.id);

                  return (
                    <Paper
                      key={plan.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        border: isCurrentPlan ? 2 : 1,
                        borderColor: isCurrentPlan ? 'primary.main' : 'divider'
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="h6" fontWeight={600}>
                              {plan.name}
                              {isCurrentPlan && <Chip label="Current Plan" color="primary" size="small" sx={{ ml: 1 }} />}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ${plan.price}/month
                            </Typography>
                          </Box>
                          {!isCurrentPlan && (
                            <Button variant="outlined" size="small" onClick={handleChangePlan}>
                              Change to This Plan
                            </Button>
                          )}
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          {plan.description}
                        </Typography>

                        <Box>
                          <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                            Modules ({plan.availableModules.length}):
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {plan.availableModules.map((moduleKey) => (
                              <Chip
                                key={moduleKey}
                                label={getModuleDisplayName(moduleKey)}
                                size="small"
                                variant="outlined"
                                color={isCurrentPlan ? 'primary' : 'default'}
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Paper>

            {/* Plan & Billing Actions */}
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Plan & Billing
              </Typography>

              <Stack spacing={2}>
                {/* Change Plan */}
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Change Plan
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Upgrade or downgrade your subscription plan. Changes will take effect immediately and you'll be charged or credited on a
                    prorated basis.
                  </Typography>
                  <Button variant="contained" onClick={handleChangePlan} startIcon={<IconShield size={18} />} fullWidth>
                    Browse Plans
                  </Button>
                </Box>

                <Divider />

                {/* Cancel/Resume Subscription */}
                <Box>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Cancel Subscription
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {willCancelAtPeriodEnd
                      ? 'Your subscription is scheduled to cancel at the end of the current billing period. You can resume it anytime before then.'
                      : 'Cancel your subscription. It will remain active until the end of the current billing period. You can resume it anytime before then.'}
                  </Typography>

                  {willCancelAtPeriodEnd ? (
                    <Button
                      variant="outlined"
                      onClick={handleResumeSubscription}
                      disabled={updateLoading}
                      startIcon={<IconCheck size={18} />}
                      color="success"
                      fullWidth
                    >
                      {updateLoading ? 'Resuming...' : 'Resume Subscription'}
                    </Button>
                  ) : (
                    <Stack spacing={2}>
                      {!confirmCancel ? (
                        <Button
                          variant="outlined"
                          onClick={handleCancelSubscription}
                          disabled={cancelLoading || isSubscriptionCanceled || !isSubscriptionActive}
                          startIcon={<IconXTabler size={18} />}
                          color="error"
                          fullWidth
                        >
                          Cancel Subscription
                        </Button>
                      ) : (
                        <>
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            Are you sure you want to cancel your subscription? It will remain active until{' '}
                            {status?.subscription_end_date
                              ? formatDate(status.subscription_end_date)
                              : 'the end of the current billing period'}
                            .
                          </Alert>
                          <Stack direction="row" spacing={2}>
                            <Button variant="outlined" onClick={() => setConfirmCancel(false)} fullWidth disabled={cancelLoading}>
                              Keep Subscription
                            </Button>
                            <Button
                              variant="contained"
                              onClick={handleCancelSubscription}
                              disabled={cancelLoading}
                              color="error"
                              fullWidth
                              startIcon={<IconXTabler size={18} />}
                            >
                              {cancelLoading ? 'Canceling...' : 'Yes, Cancel Subscription'}
                            </Button>
                          </Stack>
                        </>
                      )}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Paper>

            {/* Payment Method & Billing History */}
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Payment & Billing
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Payment method management and billing history will be available soon. For now, payment methods are managed through Stripe
                Checkout. You can view your invoices and payment history through your Stripe customer portal or contact support for
                assistance.
              </Alert>
            </Paper>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
