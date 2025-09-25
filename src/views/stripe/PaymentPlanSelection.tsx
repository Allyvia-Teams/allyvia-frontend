import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Container,
  Grid,
  Chip,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  Paper,
  Stack,
  Collapse,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Check as CheckIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  WorkspacePremium as WorkspacePremiumIcon,
  ArrowForward as ArrowForwardIcon,
  EmojiEvents as EmojiEventsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarToday as CalendarIcon,
  Storage as StorageIcon,
  IntegrationInstructions as IntegrationsIcon,
  Support as SupportIcon,
  AccessTime as TimeIcon,
  BarChart as AnalyticsIcon,
  QrCodeScanner as ScannerIcon,
  ShoppingCart as OrderIcon,
  Security as SecurityIcon,
  Lock as LockIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme, selected }) => ({
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  border: selected ? `3px solid ${theme.palette.primary.main}` : '3px solid #e0e0e0',
  borderRadius: 16,
  height: '100%',
  minHeight: '600px',
  width: '100%',
  maxWidth: '350px',
  position: 'relative',
  overflow: 'visible',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: selected ? `0 12px 30px rgba(25, 118, 210, 0.2)` : '0 4px 12px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
    transform: 'translateY(-4px)',
    borderColor: selected ? theme.palette.primary.main : '#bdbdbd'
  }
}));

const StyledCardContent = styled(CardContent)({
  textAlign: 'center',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  '&:last-child': {
    paddingBottom: '24px'
  }
});

const PlanAvatar = styled(Avatar)(({ bgcolor }) => ({
  width: 64,
  height: 64,
  bgcolor: bgcolor,
  margin: '0 auto 16px auto'
}));

const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  flex: 1,
  flexDirection: 'column',
  padding: theme.spacing(2),
  borderRadius: '50px !important',
  margin: '0 4px',
  '&.Mui-selected': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark
    }
  },
  '&:first-of-type': {
    marginLeft: 0
  },
  '&:last-of-type': {
    marginRight: 0
  }
}));

const StyledRadio = styled(Radio)(({ theme }) => ({
  position: 'absolute',
  top: 16,
  right: 16,
  padding: 0,
  '& .MuiSvgIcon-root': {
    fontSize: 28,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
    border: '2px solid #e0e0e0',
    '&.Mui-checked': {
      backgroundColor: theme.palette.primary.main,
      borderColor: theme.palette.primary.main,
      color: 'white'
    }
  }
}));

const FeatureIcon = ({ type }) => {
  const iconProps = { sx: { fontSize: 18, color: 'primary.main' } };

  switch (type) {
    case 'calendar':
      return <CalendarIcon {...iconProps} />;
    case 'storage':
      return <StorageIcon {...iconProps} />;
    case 'integrations':
      return <IntegrationsIcon {...iconProps} />;
    case 'support':
      return <SupportIcon {...iconProps} />;
    case 'time':
      return <TimeIcon {...iconProps} />;
    case 'analytics':
      return <AnalyticsIcon {...iconProps} />;
    case 'scanner':
      return <ScannerIcon {...iconProps} />;
    case 'orders':
      return <OrderIcon {...iconProps} />;
    default:
      return <CheckIcon {...iconProps} />;
  }
};

export default function PaymentPlanSelection() {
  const [selectedPlan, setSelectedPlan] = useState('service');
  const [billingCycle, setBillingCycle] = useState('12');
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const plans = {
    service: {
      name: 'Service-Based Businesses',
      price: 29.99,
      stripePriceId: 'prod_T6HRZcS28hiLQO',
      icon: PeopleIcon,
      color: '#1976d2',
      keyFeatures: [
        { name: 'QuickBooks/Square/Clover integrations', icon: 'integrations' },
        { name: 'Calendar management', icon: 'calendar' },
        { name: 'Document storage', icon: 'storage' }
      ],
      allFeatures: [
        { name: 'QuickBooks/Square/Clover integrations', icon: 'integrations' },
        { name: 'Calendar management', icon: 'calendar' },
        { name: 'Document storage', icon: 'storage' },
        { name: 'CRM system', icon: 'support' },
        { name: 'Employee time clocking', icon: 'time' },
        { name: 'Analytics dashboard', icon: 'analytics' }
      ],
      differentiators: ['Basic integrations', 'Standard support']
    },
    goods: {
      name: 'Goods-Based Businesses',
      price: 39.99,
      stripePriceId: 'prod_T6HSeK49wpdpLd',
      icon: InventoryIcon,
      color: '#1565c0',
      popular: true,
      keyFeatures: [
        { name: 'All Service-Based features', icon: 'integrations' },
        { name: 'Inventory management', icon: 'storage' },
        { name: 'Barcode scanning', icon: 'scanner' }
      ],
      allFeatures: [
        { name: 'All Service-Based features', icon: 'integrations' },
        { name: 'Inventory management', icon: 'storage' },
        { name: 'Full QuickBooks support', icon: 'integrations' },
        { name: 'Barcode scanning', icon: 'scanner' },
        { name: 'Stock tracking', icon: 'analytics' },
        { name: 'Purchase order management', icon: 'orders' }
      ],
      differentiators: ['Advanced inventory tracking', 'Barcode scanning']
    },
    pro: {
      name: 'Pro Plan',
      price: 59.99,
      stripePriceId: 'prod_T6HTdnkGDQsDxv',
      icon: WorkspacePremiumIcon,
      color: '#0d47a1',
      keyFeatures: [
        { name: 'All Goods-Based features', icon: 'integrations' },
        { name: '1-on-1 data migration support', icon: 'support' },
        { name: '24/7 dedicated support line', icon: 'support' }
      ],
      allFeatures: [
        { name: 'All Goods-Based features', icon: 'integrations' },
        { name: '1-on-1 data migration support', icon: 'support' },
        { name: '24/7 dedicated support line', icon: 'support' },
        { name: 'Personalized setup assistance', icon: 'support' },
        { name: 'Tailored business adjustments', icon: 'support' },
        { name: 'Priority feature requests', icon: 'support' }
      ],
      differentiators: ['White-glove onboarding', 'Dedicated success manager']
    }
  };

  const calculateSavings = (monthlyPrice) => {
    if (typeof monthlyPrice !== 'number') return 0;
    const discount = billingCycle === '12' ? 0.15 : 0.08;
    return Math.round(monthlyPrice * 12 * discount);
  };

  const getDiscountedPrice = (monthlyPrice) => {
    if (typeof monthlyPrice !== 'number') return monthlyPrice;
    const discount = billingCycle === '12' ? 0.15 : 0.08;
    return (monthlyPrice * (1 - discount)).toFixed(2);
  };

  const handleBillingChange = (event, newBilling) => {
    if (newBilling !== null) {
      setBillingCycle(newBilling);
    }
  };

  const toggleExpanded = (planKey) => {
    setExpandedPlan(expandedPlan === planKey ? null : planKey);
  };

  // Handle subscription creation
  const handleSubscribe = async () => {
    setIsLoading(true);
    setError('');

    try {
      const selectedPlanData = plans[selectedPlan];

      if (!selectedPlanData) {
        throw new Error('Please select a valid plan');
      }

      // Get current user ID - you might get this from context, props, or auth state
      // For now, I'm assuming you have a way to get the current user
      // const currentUser = getCurrentUser(); // Replace with your actual user retrieval logic

      // if (!currentUser?.id) {
      //   throw new Error('User authentication required');
      // }

      const response = await fetch('/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Add authorization header if needed
          // 'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          price_id: selectedPlanData.stripePriceId,
          // user_id: currentUser.id,
          billing_cycle: billingCycle,
          plan_name: selectedPlanData.name,
          // Optional: Add trial period information
          trial_period_days: 30
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { checkout_url } = await response.json();

      if (!checkout_url) {
        throw new Error('Invalid checkout URL received');
      }

      // Redirect to Stripe Checkout
      window.location.href = checkout_url;
      navigate('/dashboard');
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message || 'An error occurred while processing your subscription');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get current user - replace with your actual implementation
  // const getCurrentUser = () => {
  //   // This is a placeholder - replace with your actual user retrieval logic
  //   // Examples:
  //   // - From React Context: const { user } = useAuth();
  //   // - From localStorage: JSON.parse(localStorage.getItem('user'));
  //   // - From Redux: useSelector(state => state.auth.user);
  //   // - From props: props.currentUser;

  //   return {
  //     id: 'user123', // Replace with actual user ID
  //     email: 'user@example.com' // Replace with actual user email
  //   };
  // };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'grey.200' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  A
                </Typography>
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Allyvia
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Step 2 of 3
            </Typography>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="xl" sx={{ py: 6 }}>
        {/* Header Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary' }}>
            Choose Your Perfect Plan
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Start with a 30-day free trial, then choose the plan that fits your business needs. All plans include full access during your
            trial period.
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
            <Alert severity="error" sx={{ maxWidth: 600 }}>
              {error}
            </Alert>
          </Box>
        )}

        {/* Billing Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Box sx={{ bgcolor: 'grey.100', p: 1, borderRadius: '50px', minWidth: 400 }}>
            <ToggleButtonGroup
              value={billingCycle}
              exclusive
              onChange={handleBillingChange}
              sx={{
                width: '100%',
                '& .MuiToggleButtonGroup-grouped': {
                  border: 'none',
                  borderRadius: '50px !important'
                }
              }}
            >
              <StyledToggleButton value="6" sx={{ px: 4 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  6 Months
                </Typography>
                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                  Save 8%
                </Typography>
              </StyledToggleButton>
              <StyledToggleButton value="12" sx={{ px: 4 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  12 Months
                </Typography>
                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                  Save 15%
                </Typography>
              </StyledToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Plans in Horizontal Layout */}
        <FormControl component="fieldset" sx={{ width: '100%', mb: 6 }}>
          <RadioGroup value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
            <Grid container spacing={3} justifyContent="center">
              {Object.entries(plans).map(([key, plan]) => {
                const Icon = plan.icon;
                const isSelected = selectedPlan === key;
                const isExpanded = expandedPlan === key;
                const savings = calculateSavings(plan.price);
                const discountedPrice = getDiscountedPrice(plan.price);

                return (
                  <Grid item xs={12} sm={6} md={4} key={key} sx={{ display: 'flex', justifyContent: 'center' }}>
                    <StyledCard selected={isSelected} onClick={() => setSelectedPlan(key)}>
                      {plan.popular && (
                        <Chip
                          label="Most Popular"
                          color="primary"
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: -10,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontWeight: 600,
                            zIndex: 10,
                            fontSize: '0.75rem',
                            height: 24
                          }}
                        />
                      )}

                      <StyledCardContent>
                        <FormControlLabel
                          value={key}
                          control={<StyledRadio />}
                          sx={{ width: '100%', m: 0, alignItems: 'flex-start', height: '100%' }}
                          label={
                            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
                              <PlanAvatar bgcolor={plan.color}>
                                <Icon sx={{ color: 'white', fontSize: 32 }} />
                              </PlanAvatar>

                              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                                {plan.name}
                              </Typography>

                              {/* Pricing */}
                              <Box sx={{ mb: 3 }}>
                                {typeof plan.price === 'number' ? (
                                  <Box>
                                    <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                      ${discountedPrice}
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary">
                                      per month
                                    </Typography>
                                    {savings > 0 && (
                                      <Box sx={{ mt: 1 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                                          ${plan.price}/month
                                        </Typography>
                                        <Chip label={`Save $${savings}/year`} color="success" size="small" sx={{ mt: 0.5 }} />
                                      </Box>
                                    )}
                                  </Box>
                                ) : (
                                  <Box>
                                    <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                      Custom
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary">
                                      Contact for pricing
                                    </Typography>
                                  </Box>
                                )}
                              </Box>

                              <Divider sx={{ mb: 2 }} />

                              {/* Key Features - This section will grow to fill available space */}
                              <Box sx={{ textAlign: 'left', mb: 2, flexGrow: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
                                  Key Features
                                </Typography>
                                {plan.keyFeatures.map((feature, index) => (
                                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <FeatureIcon type={feature.icon} />
                                    <Typography variant="body2" sx={{ ml: 1 }}>
                                      {feature.name}
                                    </Typography>
                                  </Box>
                                ))}

                                {/* Differentiators */}
                                <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                                    BEST FOR:
                                  </Typography>
                                  {plan.differentiators.map((diff, index) => (
                                    <Typography key={index} variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                                      • {diff}
                                    </Typography>
                                  ))}
                                </Box>
                              </Box>

                              {/* Bottom section - always at the bottom */}
                              <Box>
                                {/* See Full Feature List */}
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpanded(key);
                                  }}
                                  endIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                  sx={{ mb: 2, textTransform: 'none' }}
                                  size="small"
                                >
                                  {isExpanded ? 'Hide' : 'See'} full feature list
                                </Button>

                                <Collapse in={isExpanded}>
                                  <Box sx={{ textAlign: 'left', mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                      Complete Feature List:
                                    </Typography>
                                    {plan.allFeatures.map((feature, index) => (
                                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                        <FeatureIcon type={feature.icon} />
                                        <Typography variant="body2" sx={{ ml: 1 }}>
                                          {feature.name}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                </Collapse>
                              </Box>
                            </Box>
                          }
                        />
                      </StyledCardContent>
                    </StyledCard>
                  </Grid>
                );
              })}
            </Grid>
          </RadioGroup>
        </FormControl>

        {/* Trial Information & CTA */}
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: 'primary.50', border: 1, borderColor: 'primary.200', mb: 3 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <EmojiEventsIcon sx={{ color: 'primary.main', mr: 1, fontSize: 28 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    30-Day Free Trial Included
                  </Typography>
                </Box>
                <Typography variant="body2" color="primary.main" sx={{ mb: 2 }}>
                  Full access to all features • No credit card required • Cancel anytime, no hidden fees
                </Typography>

                {/* Money-back guarantee */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <CheckIcon sx={{ color: 'success.main', mr: 1, fontSize: 16 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                    100% Money-Back Guarantee
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Action Button with Security Badges */}
            <Stack spacing={2} alignItems="center">
              <Button
                variant="contained"
                size="large"
                endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
                disabled={isLoading}
                onClick={handleSubscribe}
                sx={{
                  py: 2,
                  px: 4,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: 2
                }}
              >
                {isLoading ? 'Processing...' : 'Start Free Trial'}
              </Button>

              {/* Security Badges */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, opacity: 0.8 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <SecurityIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="caption" color="text.secondary">
                    SSL Secured
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LockIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="caption" color="text.secondary">
                    Stripe Secure
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <VerifiedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="caption" color="text.secondary">
                    PCI Compliant
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        {/* Footer Note */}
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="body2" color="text.secondary">
            All plans include email support, automatic backups, and 99.9% uptime guarantee. Upgrade, downgrade, or cancel at any time.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
