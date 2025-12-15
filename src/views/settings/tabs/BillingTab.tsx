import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  Chip,
  Alert,
  Box,
  Grid,
  CircularProgress,
  Radio,
  Collapse,
  FormControl,
  RadioGroup
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  WorkspacePremium as WorkspacePremiumIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useSelector, useDispatch } from 'store';
import { useIsAdmin } from 'hooks/usePermission';
import { fetchSubscriptionStatus, createCheckoutSession, clearCancelSuccess } from 'store/slices/subscription';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { SUBSCRIPTION_PLANS, getPlanByName } from 'config/subscription-plans';

const StyledCard = styled(Card)<{ selected?: boolean; isCurrent?: boolean }>(({ theme, selected, isCurrent }) => ({
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  border: selected || isCurrent ? `2px solid ${theme.palette.primary.main}` : '1px solid #e0e0e0',
  borderRadius: 8,
  height: '100%',
  width: '100%',
  position: 'relative',
  overflow: 'visible',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: selected || isCurrent ? `0 4px 12px rgba(25, 118, 210, 0.15)` : '0 2px 4px rgba(0, 0, 0, 0.05)',
  '&:hover': {
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    borderColor: selected || isCurrent ? theme.palette.primary.main : theme.palette.primary.light
  }
}));

export default function BillingTab() {
  const dispatch = useDispatch();
  const isAdmin = useIsAdmin();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [expandedSubscriptionDetails, setExpandedSubscriptionDetails] = useState(false);
  const subscriptionState = useSelector((s) => s.subscription);

  const toggleSubscriptionDetails = () => {
    setExpandedSubscriptionDetails(!expandedSubscriptionDetails);
  };

  // Plan icons and colors mapping
  const planIcons = {
    service: PeopleIcon,
    goods: InventoryIcon,
    pro: WorkspacePremiumIcon
  };

  const planColors = {
    service: '#1976d2',
    goods: '#1565c0',
    pro: '#0d47a1'
  };

  const { status, statusLoading, statusError, cancelSuccess, cancelError, checkoutLoading, checkoutError } = subscriptionState;

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

  // Initialize selected plan to current plan if exists and auto-expand current plan
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

  // Auto-expand subscription details if there's an active subscription
  useEffect(() => {
    if (hasSubscription && currentPlan) {
      setExpandedSubscriptionDetails(true);
    }
  }, [hasSubscription, currentPlan]);

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
                    // Get all plans and sort by price (lowest first for display)
                    const allPlans = Object.values(SUBSCRIPTION_PLANS).sort((a, b) => a.price - b.price);
                    const currentPlanId = currentPlan?.id || null;

                    return (
                      <FormControl component="fieldset" sx={{ width: '100%' }}>
                        <RadioGroup
                          value={selectedPlanId || ''}
                          onChange={(e) => setSelectedPlanId(e.target.value as 'service' | 'goods' | 'pro')}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                              width: '100%'
                            }}
                          >
                            {allPlans.map((plan) => {
                              const isSelected = selectedPlanId === plan.id;
                              const isCurrent = currentPlanId === plan.id;
                              const PlanIcon = planIcons[plan.id as keyof typeof planIcons];
                              const planColor = planColors[plan.id as keyof typeof planColors];

                              return (
                                <Box
                                  key={plan.id}
                                  sx={{
                                    width: '100%',
                                    display: 'flex'
                                  }}
                                >
                                  <StyledCard selected={isSelected} isCurrent={isCurrent} onClick={() => setSelectedPlanId(plan.id)}>
                                    <CardContent sx={{ p: 3 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                          <Box
                                            sx={{
                                              width: 48,
                                              height: 48,
                                              borderRadius: 2,
                                              bgcolor: planColor,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center'
                                            }}
                                          >
                                            <PlanIcon sx={{ color: 'white', fontSize: 24 }} />
                                          </Box>
                                          <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                                {plan.name}
                                              </Typography>
                                              {isCurrent && (
                                                <Chip
                                                  label="CURRENT"
                                                  color="primary"
                                                  size="small"
                                                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                                                />
                                              )}
                                            </Box>
                                            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                              ${plan.price}
                                              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                                                /month
                                              </Typography>
                                            </Typography>
                                          </Box>
                                        </Box>
                                        <Radio
                                          checked={isSelected}
                                          onChange={() => setSelectedPlanId(plan.id)}
                                          onClick={(e) => e.stopPropagation()}
                                          sx={{
                                            color: isCurrent || isSelected ? 'primary.main' : 'action.disabled',
                                            '&.Mui-checked': {
                                              color: 'primary.main'
                                            }
                                          }}
                                        />
                                      </Box>

                                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {plan.description}
                                      </Typography>

                                      <Box
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          p: 1.5,
                                          bgcolor: 'grey.50',
                                          borderRadius: 1
                                        }}
                                      >
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                          Modules Included:
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                          {plan.availableModules.length}
                                        </Typography>
                                      </Box>

                                      {/* Subscription Details - Only for Current Plan - Horizontal Minimal Summary */}
                                      {isCurrent && hasSubscription && (
                                        <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                                          <Box
                                            sx={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              mb: 2
                                            }}
                                          >
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                              Subscription Details
                                            </Typography>
                                            <Button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSubscriptionDetails();
                                              }}
                                              endIcon={expandedSubscriptionDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                              sx={{ textTransform: 'none', color: 'primary.main', minWidth: 'auto', p: 0.5 }}
                                              size="small"
                                            >
                                              {expandedSubscriptionDetails ? 'Less' : 'More'}
                                            </Button>
                                          </Box>

                                          {/* Minimal Horizontal Summary Card */}
                                          <Box
                                            sx={{
                                              display: 'flex',
                                              flexDirection: 'row',
                                              gap: 2,
                                              p: 2,
                                              bgcolor: 'grey.50',
                                              borderRadius: 2,
                                              border: 1,
                                              borderColor: 'divider',
                                              flexWrap: 'wrap',
                                              alignItems: 'center'
                                            }}
                                          >
                                            {status?.subscription_status && (
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                  Status:
                                                </Typography>
                                                <Chip
                                                  label={status.subscription_status.toUpperCase()}
                                                  color={
                                                    status.subscription_status === 'active'
                                                      ? 'success'
                                                      : status.subscription_status === 'trialing'
                                                        ? 'info'
                                                        : 'default'
                                                  }
                                                  size="small"
                                                  sx={{ fontWeight: 600, height: 24 }}
                                                />
                                              </Box>
                                            )}
                                            {status?.subscription_details?.start_date && (
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                  Started:
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                                  {formatDate(status.subscription_details.start_date)}
                                                </Typography>
                                              </Box>
                                            )}
                                            {status?.subscription_status === 'active' && status?.subscription_details?.renewal_date && (
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                  Next Billing:
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                                  {formatDate(status.subscription_details.renewal_date)}
                                                </Typography>
                                              </Box>
                                            )}
                                            {status?.subscription_status === 'trialing' && status?.current_plan?.trial_end_date && (
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                  Trial Ends:
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                                  {formatDate(status.current_plan.trial_end_date)}
                                                </Typography>
                                              </Box>
                                            )}
                                            {getEndDate() && (
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                                  End Date:
                                                </Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                                  {formatDate(getEndDate()!)}
                                                </Typography>
                                              </Box>
                                            )}
                                          </Box>

                                          {/* Expanded Details */}
                                          <Collapse in={expandedSubscriptionDetails}>
                                            <Box
                                              sx={{
                                                mt: 2,
                                                pt: 2,
                                                borderTop: 1,
                                                borderColor: 'divider',
                                                display: 'flex',
                                                flexDirection: 'row',
                                                gap: 2,
                                                flexWrap: 'wrap'
                                              }}
                                            >
                                              {status?.subscription_details?.subscription_id && (
                                                <Box>
                                                  <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    display="block"
                                                    sx={{ mb: 0.5, fontWeight: 600 }}
                                                  >
                                                    Subscription ID
                                                  </Typography>
                                                  <Typography
                                                    variant="body2"
                                                    sx={{
                                                      fontFamily: 'monospace',
                                                      fontWeight: 500,
                                                      color: 'text.primary',
                                                      fontSize: '0.75rem'
                                                    }}
                                                  >
                                                    {status.subscription_details.subscription_id}
                                                  </Typography>
                                                </Box>
                                              )}
                                              {planName && (
                                                <Box>
                                                  <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    display="block"
                                                    sx={{ mb: 0.5, fontWeight: 600 }}
                                                  >
                                                    Plan Name
                                                  </Typography>
                                                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                                    {planName.replace(/\s+Plan\s*$/i, '')}
                                                  </Typography>
                                                </Box>
                                              )}
                                              {status?.subscription_details?.cancel_at && (
                                                <Box sx={{ width: '100%', mt: 1 }}>
                                                  <Alert severity="warning" icon={<IconAlertCircle />} sx={{ py: 0.5 }}>
                                                    Subscription will be canceled on {formatDate(status.subscription_details.cancel_at)}
                                                  </Alert>
                                                </Box>
                                              )}
                                            </Box>
                                          </Collapse>
                                        </Box>
                                      )}
                                    </CardContent>
                                  </StyledCard>
                                </Box>
                              );
                            })}
                          </Box>
                        </RadioGroup>

                        {/* Continue Button */}
                        {selectedPlanId && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 3 }}>
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
                      </FormControl>
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
