import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  Chip,
  Alert,
  Box,
  Divider,
  Grid,
  CircularProgress,
  Paper,
  Collapse,
  Radio
} from '@mui/material';
import { useSelector, useDispatch } from 'store';
import { useIsAdmin } from 'hooks/usePermission';
import { fetchSubscriptionStatus, cancelSubscription, createCheckoutSession, clearCancelSuccess } from 'store/slices/subscription';
import { IconCreditCard, IconAlertCircle, IconRefresh, IconX, IconCode, IconCheck } from '@tabler/icons-react';
import { getModuleDisplayName } from 'menu-items/permissionData';
import { SUBSCRIPTION_PLANS, getPlanByName } from 'config/subscription-plans';
import { COLORS } from 'styles/colors';

export default function BillingTab() {
  const dispatch = useDispatch();
  const isAdmin = useIsAdmin();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const subscriptionState = useSelector((s) => s.subscription);

  const { status, statusLoading, statusError, cancelLoading, cancelSuccess, cancelError, checkoutLoading, checkoutError } =
    subscriptionState;

  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchSubscriptionStatus());
    }
  }, [dispatch, isAdmin]);

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

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
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

  // Single condition to check if subscription exists and should be displayed
  const hasSubscription =
    status?.subscription_plan &&
    (status?.status === 'Active' || status?.subscription_status === 'active' || status?.subscription_status === 'trialing');

  // Get plan name from current_plan or subscription_plan
  const planName = status?.current_plan?.plan_name || status?.subscription_plan || null;
  const currentPlan = planName ? getPlanByName(planName) : null;

  // Debug: Log detailed comparison for troubleshooting
  // Uncomment to debug plan matching issues
  useEffect(() => {
    if (planName && process.env.NODE_ENV === 'development') {
      const allPlans = Object.values(SUBSCRIPTION_PLANS);
      const comparison = {
        original: {
          api_plan_name: planName,
          from_current_plan: status?.current_plan?.plan_name,
          from_subscription_plan: status?.subscription_plan,
          subscription_status: status?.subscription_status
        },
        matching: {
          normalized_input: planName
            .toLowerCase()
            .replace(/\s+plan\s*$/i, '')
            .trim(),
          normalized_input_base: planName
            .toLowerCase()
            .replace(/\s+plan\s*$/i, '')
            .trim()
            .replace(/es$/, '')
            .replace(/s$/, ''),
          matched_plan: currentPlan
            ? {
                id: currentPlan.id,
                name: currentPlan.name,
                price: currentPlan.price
              }
            : null,
          matched_plan_id: currentPlan?.id || null
        },
        available_config_plans: allPlans.map((p) => {
          const normalized = p.name
            .toLowerCase()
            .replace(/\s+plan\s*$/i, '')
            .trim();
          return {
            id: p.id,
            name: p.name,
            normalized_name: normalized,
            normalized_base: normalized.replace(/es$/, '').replace(/s$/, '')
          };
        }),
        comparison_result: {
          match_found: !!currentPlan,
          match_reason: currentPlan ? 'Matched via getPlanByName()' : 'No match found - check normalization logic',
          suggestion: !currentPlan
            ? `API returned "${planName}" but no matching config plan found. Available plans: ${allPlans.map((p) => p.name).join(', ')}`
            : `Successfully matched "${planName}" to "${currentPlan.name}" (ID: ${currentPlan.id})`
        }
      };
      console.group('🔍 Plan Matching Comparison');
      console.log('Original API Response:', comparison.original);
      console.log('Matching Result:', comparison.matching);
      console.log('Available Config Plans:', comparison.available_config_plans);
      console.log('Comparison Result:', comparison.comparison_result);
      console.log('Full Comparison Object:', comparison);
      console.groupEnd();
    }
  }, [planName, currentPlan, status]);

  // Helper to get subscription ID (from nested or top-level)
  const getSubscriptionId = () => {
    return status?.subscription_details?.subscription_id || status?.subscription_id || null;
  };

  // Helper to get start date (from nested or top-level)
  const getStartDate = () => {
    return status?.subscription_details?.start_date || status?.subscription_start_date || null;
  };

  // Helper to get end/renewal date (from nested or top-level)
  const getEndDate = () => {
    return (
      status?.subscription_details?.subscription_end_date ||
      status?.subscription_details?.renewal_date ||
      status?.subscription_end_date ||
      status?.subscription_cancel_at ||
      null
    );
  };

  // Helper to get cancel_at (from nested or top-level)
  const getCancelAt = () => {
    return status?.subscription_details?.cancel_at || status?.subscription_cancel_at || null;
  };

  // Helper to get trial end date (from nested or top-level)
  const getTrialEndDate = () => {
    return status?.subscription_details?.trial_end_date || status?.current_plan?.trial_end_date || status?.trial_end_date || null;
  };

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

  const handleChangePlan = async (plan: (typeof SUBSCRIPTION_PLANS)[keyof typeof SUBSCRIPTION_PLANS]) => {
    try {
      const checkoutData = {
        price_id: plan.stripePriceId,
        billing_cycle: '12', // Default to annual billing
        plan_name: plan.name,
        trial_period_days: 30
      };

      // Debug: Log checkout request data
      console.log('🛒 Creating Checkout Session with data:', {
        planId: plan.id,
        planName: plan.name,
        planPrice: plan.price,
        stripeProductId: plan.stripePriceId,
        checkoutRequest: checkoutData,
        note: 'Backend should map Product ID to correct Price ID based on billing_cycle'
      });

      const result = await dispatch(createCheckoutSession(checkoutData));

      // Handle both unwrap() and dispatch() response formats
      const response = result.payload || (result as any);

      // Debug: Log checkout response
      console.log('✅ Checkout Session Response:', {
        fullResponse: result,
        payload: result.payload,
        checkout_url: response?.checkout_url,
        session_id: response?.session_id
      });

      const checkoutUrl = response?.checkout_url || (result as any).checkout_url;
      if (checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Invalid checkout URL received from server');
      }
    } catch (error) {
      console.error('❌ Failed to create checkout session:', error);
    }
  };

  const handleContinue = () => {
    if (!selectedPlanId) return;

    const selectedPlan = Object.values(SUBSCRIPTION_PLANS).find((plan) => plan.id === selectedPlanId);
    if (selectedPlan) {
      // Debug: Log the plan being sent to checkout
      if (process.env.NODE_ENV === 'development') {
        console.log('🛒 Checkout Plan:', {
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          price: selectedPlan.price,
          stripePriceId: selectedPlan.stripePriceId
        });
      }
      handleChangePlan(selectedPlan);
    } else {
      console.error('Selected plan not found:', selectedPlanId);
    }
  };

  // Initialize selected plan to current plan if exists
  useEffect(() => {
    if (currentPlan?.id) {
      setSelectedPlanId(currentPlan.id);
      // Debug: Log selection initialization
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Auto-selecting current plan:', {
          currentPlanId: currentPlan.id,
          currentPlanName: currentPlan.name,
          selectedPlanId: currentPlan.id
        });
      }
    } else {
      // Debug: Log when current plan is not found
      if (process.env.NODE_ENV === 'development' && planName) {
        console.warn('⚠️ Current plan not found:', {
          planNameFromAPI: planName,
          availablePlans: Object.values(SUBSCRIPTION_PLANS).map((p) => ({ id: p.id, name: p.name }))
        });
      }
    }
  }, [currentPlan?.id, currentPlan?.name, planName]);

  const handleRefreshStatus = () => {
    dispatch(fetchSubscriptionStatus());
  };

  useEffect(() => {
    if (cancelSuccess) {
      const timer = setTimeout(() => {
        dispatch(clearCancelSuccess());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [cancelSuccess, dispatch]);

  if (!isAdmin) {
    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Alert severity="info">Only administrators can view billing and subscription information.</Alert>
        </Grid>
      </Grid>
    );
  }

  if (statusLoading && !status) {
    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                <CircularProgress />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Stack spacing={3}>
          {/* Success/Error Messages */}
          {cancelSuccess && (
            <Alert severity="success" onClose={() => dispatch(clearCancelSuccess())}>
              Subscription will be canceled at the end of the current billing period.
            </Alert>
          )}
          {cancelError && (
            <Alert severity="error" onClose={() => dispatch(clearCancelSuccess())}>
              {cancelError}
            </Alert>
          )}
          {checkoutError && (
            <Alert severity="error" onClose={() => dispatch(clearCancelSuccess())}>
              {checkoutError}
            </Alert>
          )}
          {statusError && <Alert severity="error">{statusError}</Alert>}

          {statusLoading && !status ? (
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* All Plans (Current + Available) */}
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Subscription Plans
                    </Typography>
                    <Button size="small" startIcon={<IconRefresh size={16} />} onClick={handleRefreshStatus} disabled={statusLoading}>
                      Refresh
                    </Button>
                  </Box>

                  {(() => {
                    // Get all plans and sort by price (highest first)
                    const allPlans = Object.values(SUBSCRIPTION_PLANS).sort((a, b) => b.price - a.price);

                    // Find current plan
                    const currentPlanId = currentPlan?.id || null;
                    const isCurrentPlan = (planId: string) => planId === currentPlanId;

                    // Debug: Log plan rendering state
                    if (process.env.NODE_ENV === 'development') {
                      console.log('📋 Plan Rendering State:', {
                        currentPlanId,
                        selectedPlanId,
                        allPlanIds: allPlans.map((p) => p.id),
                        planStates: allPlans.map((p) => ({
                          id: p.id,
                          name: p.name,
                          isCurrent: isCurrentPlan(p.id),
                          isSelected: selectedPlanId === p.id
                        }))
                      });
                    }

                    return (
                      <Stack spacing={2}>
                        {allPlans.map((plan) => {
                          const isSelected = selectedPlanId === plan.id;
                          const isCurrent = isCurrentPlan(plan.id);

                          // Show "CURRENT PLAN" badge only when it's the current plan AND it's selected
                          // When another plan is selected, hide the current plan badge
                          const showCurrentBadge = isCurrent && isSelected;
                          const showSelectedBadge = isSelected && !isCurrent;

                          return (
                            <Paper
                              key={plan.id}
                              variant="outlined"
                              onClick={() => {
                                setSelectedPlanId(plan.id);
                                if (process.env.NODE_ENV === 'development') {
                                  console.log('🖱️ Plan clicked:', {
                                    planId: plan.id,
                                    planName: plan.name,
                                    isCurrentPlan: isCurrent,
                                    newSelectedPlanId: plan.id
                                  });
                                }
                              }}
                              sx={{
                                p: 3,
                                border: isCurrent || isSelected ? 2 : 1,
                                borderColor: isCurrent ? 'primary.main' : isSelected ? COLORS.goodGreen : 'divider',
                                backgroundColor: 'background.paper',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                  boxShadow: 2,
                                  borderColor: isCurrent ? 'primary.main' : isSelected ? COLORS.goodGreen : 'primary.main'
                                }
                              }}
                            >
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  right: 0,
                                  bgcolor: showCurrentBadge ? 'primary.main' : showSelectedBadge ? COLORS.goodGreen : 'transparent',
                                  color: showCurrentBadge || showSelectedBadge ? COLORS.white : 'transparent',
                                  px: 1.5,
                                  py: 0.5,
                                  borderBottomLeftRadius: 4,
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}
                              >
                                {showCurrentBadge ? 'CURRENT PLAN' : showSelectedBadge ? 'SELECTED' : ''}
                              </Box>
                              <Stack spacing={2} sx={{ pt: isCurrent || isSelected ? 1 : 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                    <Radio
                                      checked={isSelected}
                                      onChange={() => setSelectedPlanId(plan.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      sx={{
                                        p: 0,
                                        color: isCurrent ? 'primary.main' : isSelected ? COLORS.goodGreen : undefined,
                                        '&.Mui-checked': {
                                          color: isCurrent ? 'primary.main' : COLORS.goodGreen
                                        }
                                      }}
                                    />
                                    <Box sx={{ flex: 1 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                                        <Typography variant="h5" fontWeight={isSelected ? 700 : 600} sx={{ color: 'text.primary' }}>
                                          {plan.name}
                                        </Typography>
                                        {isCurrent && status?.subscription_status && (
                                          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                                            ({status.subscription_status})
                                          </Typography>
                                        )}
                                      </Box>
                                      <Typography variant="h4" fontWeight={600}>
                                        ${plan.price}
                                        <Typography component="span" variant="body1" color="text.secondary" sx={{ ml: 0.5 }}>
                                          /month
                                        </Typography>
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Box>

                                <Typography variant="body2" color="text.secondary">
                                  {plan.description}
                                </Typography>

                                <Box>
                                  <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
                                    Modules ({plan.availableModules.length}):
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {plan.availableModules.map((moduleKey) => (
                                      <Chip
                                        key={moduleKey}
                                        label={getModuleDisplayName(moduleKey)}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem' }}
                                      />
                                    ))}
                                  </Box>
                                </Box>

                                {isCurrent && hasSubscription && (
                                  <Box>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                                      Subscription Details
                                    </Typography>
                                    <Grid container spacing={2}>
                                      {planName && (
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            Current Plan
                                          </Typography>
                                          <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                                            {planName.replace(/\s+Plan\s*$/i, '')}
                                          </Typography>
                                        </Grid>
                                      )}
                                      {status?.subscription_details?.subscription_id && (
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            Subscription ID
                                          </Typography>
                                          <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5, fontWeight: 500 }}>
                                            {status.subscription_details.subscription_id}
                                          </Typography>
                                        </Grid>
                                      )}
                                      {status?.subscription_details?.start_date && (
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            Start Date
                                          </Typography>
                                          <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                                            {formatDate(status.subscription_details.start_date)}
                                          </Typography>
                                        </Grid>
                                      )}
                                      {status?.subscription_status === 'trialing' && status?.current_plan?.trial_end_date && (
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            Trial Ends
                                          </Typography>
                                          <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                                            {formatDate(status.current_plan.trial_end_date)}
                                          </Typography>
                                        </Grid>
                                      )}
                                      {status?.subscription_status === 'active' && status?.subscription_details?.renewal_date && (
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            Next Billing Date
                                          </Typography>
                                          <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                                            {formatDate(status.subscription_details.renewal_date)}
                                          </Typography>
                                        </Grid>
                                      )}
                                      <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          End Date
                                        </Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
                                          {getEndDate() ? formatDate(getEndDate()!) : '-'}
                                        </Typography>
                                      </Grid>
                                      {status?.subscription_status && (
                                        <Grid size={{ xs: 12, sm: 6 }}>
                                          <Typography variant="caption" color="text.secondary" display="block">
                                            Status
                                          </Typography>
                                          <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500, textTransform: 'uppercase' }}>
                                            {status.subscription_status}
                                          </Typography>
                                        </Grid>
                                      )}
                                      {status?.subscription_details?.cancel_at && (
                                        <Grid size={{ xs: 12 }}>
                                          <Alert severity="warning" icon={<IconAlertCircle />} sx={{ mt: 1 }}>
                                            Subscription will be canceled at the end of the current billing period (
                                            {formatDate(status.subscription_details.cancel_at)})
                                          </Alert>
                                        </Grid>
                                      )}
                                    </Grid>
                                  </Box>
                                )}
                              </Stack>
                            </Paper>
                          );
                        })}

                        {/* Continue Button */}
                        {selectedPlanId && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
                            <Button
                              variant="contained"
                              size="large"
                              onClick={handleContinue}
                              disabled={checkoutLoading || selectedPlanId === currentPlanId}
                              sx={{ minWidth: 150 }}
                            >
                              {checkoutLoading ? 'Processing...' : selectedPlanId === currentPlanId ? 'Current Plan' : 'Continue'}
                            </Button>
                          </Box>
                        )}
                      </Stack>
                    );
                  })()}
                </CardContent>
              </Card>
            </>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
}
