import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'store';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Container,
  Avatar,
  Paper,
  Stack,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fade,
  Zoom
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Dashboard as DashboardIcon,
  Payment as PaymentIcon,
  Verified as VerifiedIcon,
  ArrowForward as ArrowForwardIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  Support as SupportIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { fetchSubscriptionStatus } from 'store/slices/subscription';
import type { SubscriptionStatusResponse } from 'types/subscription';

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  border: `1px solid ${theme.palette.grey[200]}`,
  overflow: 'visible'
}));

const SuccessAvatar = styled(Avatar)(({ theme }) => ({
  width: 80,
  height: 80,
  backgroundColor: theme.palette.success.main,
  margin: '0 auto 24px auto',
  boxShadow: `0 8px 24px ${theme.palette.success.main}40`
}));

const ErrorAvatar = styled(Avatar)(({ theme }) => ({
  width: 80,
  height: 80,
  backgroundColor: theme.palette.error.main,
  margin: '0 auto 24px auto',
  boxShadow: `0 8px 24px ${theme.palette.error.main}40`
}));

const LoadingAvatar = styled(Avatar)(({ theme }) => ({
  width: 80,
  height: 80,
  backgroundColor: theme.palette.primary.main,
  margin: '0 auto 24px auto',
  boxShadow: `0 8px 24px ${theme.palette.primary.main}40`
}));

const CheckoutSuccessPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionStatusResponse | null>(null);
  const [countdown, setCountdown] = useState(5);

  const steps = [
    {
      label: 'Payment Confirmed',
      description: 'Your payment has been successfully processed',
      icon: <PaymentIcon />
    },
    {
      label: 'Subscription Activated',
      description: 'Your account is being set up with full access',
      icon: <VerifiedIcon />
    },
    {
      label: 'Ready to Go',
      description: 'Everything is ready! Redirecting to your dashboard',
      icon: <DashboardIcon />
    }
  ];

  useEffect(() => {
    const verifySubscription = async () => {
      try {
        // Check if session_id exists in URL params from Stripe redirect
        const sessionId = searchParams.get('session_id');

        if (!sessionId) {
          throw new Error('Invalid checkout session. Please try again or contact support.');
        }

        // Step 1: Payment confirmed (immediate)
        setActiveStep(0);
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Step 2: Checking subscription (wait for webhook processing)
        setActiveStep(1);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check subscription status
        const result = await dispatch(fetchSubscriptionStatus());

        if (fetchSubscriptionStatus.fulfilled.match(result)) {
          const data = result.payload as SubscriptionStatusResponse;
          setSubscriptionData(data);

          if (data.status === 'Active') {
            // Step 3: Success
            setActiveStep(2);
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Start countdown
            const countdownInterval = setInterval(() => {
              setCountdown((prev) => {
                if (prev <= 1) {
                  clearInterval(countdownInterval);
                  navigate('/dashboard');
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          } else {
            const countdownInterval = setInterval(() => {
              setCountdown((prev) => {
                if (prev <= 1) {
                  clearInterval(countdownInterval);
                  navigate('/paymentplan');
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
            // throw new Error('Subscription activation is still processing. Please check back in a few minutes or contact support.');
          }
        } else {
          throw new Error('Failed to verify subscription status. Please contact support.');
        }
      } catch (err) {
        console.error('Subscription verification error:', err);
        setError(err instanceof Error ? err.message : 'Failed to verify subscription');
      } finally {
        setIsVerifying(false);
      }
    };

    verifySubscription();
  }, [dispatch, navigate, searchParams]);

  const handleManualRedirect = () => {
    navigate('/dashboard');
  };

  const handleRetryPayment = () => {
    navigate('/payment-plan');
  };

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
              Step 3 of 3
            </Typography>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <StyledCard sx={{ width: '100%', maxWidth: 600 }}>
            <CardContent sx={{ p: 6, textAlign: 'center' }}>
              {/* Loading State */}
              {isVerifying && !error && (
                <Fade in={true}>
                  <Box>
                    <LoadingAvatar>
                      <CircularProgress size={40} color="inherit" />
                    </LoadingAvatar>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
                      Processing Your Subscription
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                      Please wait while we set up your account...
                    </Typography>

                    {/* Progress Stepper */}
                    <Box sx={{ textAlign: 'left', maxWidth: 400, mx: 'auto' }}>
                      <Stepper activeStep={activeStep} orientation="vertical">
                        {steps.map((step, index) => (
                          <Step key={step.label}>
                            <StepLabel
                              StepIconComponent={() => (
                                <Box
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: index <= activeStep ? 'primary.main' : 'grey.300',
                                    color: 'white',
                                    transition: 'all 0.3s ease'
                                  }}
                                >
                                  {index < activeStep ? (
                                    <CheckCircleIcon sx={{ fontSize: 20 }} />
                                  ) : index === activeStep ? (
                                    <CircularProgress size={16} color="inherit" />
                                  ) : (
                                    step.icon
                                  )}
                                </Box>
                              )}
                            >
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {step.label}
                              </Typography>
                            </StepLabel>
                            <StepContent>
                              <Typography variant="body2" color="text.secondary">
                                {step.description}
                              </Typography>
                            </StepContent>
                          </Step>
                        ))}
                      </Stepper>
                    </Box>
                  </Box>
                </Fade>
              )}

              {/* Success State */}
              {!isVerifying && !error && subscriptionData?.status === 'Active' && (
                <Zoom in={true}>
                  <Box>
                    <SuccessAvatar>
                      <CheckCircleIcon sx={{ fontSize: 48, color: 'white' }} />
                    </SuccessAvatar>
                    <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: 'success.main' }}>
                      Welcome to Allyvia!
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                      Your subscription has been successfully activated
                    </Typography>

                    {/* Subscription Details */}
                    <Box sx={{ bgcolor: 'success.50', p: 3, borderRadius: 2, mb: 4 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'success.main' }}>
                        Subscription Details
                      </Typography>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            Plan:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {'subscription_plan' in subscriptionData ? subscriptionData.subscription_plan : 'Premium Plan'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">
                            Status:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                            {'subscription_status' in subscriptionData ? subscriptionData.subscription_status : 'Active'}
                          </Typography>
                        </Box>
                        {'trial_end_date' in subscriptionData && subscriptionData.trial_end_date && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">
                              Trial Ends:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {new Date(subscriptionData.trial_end_date).toLocaleDateString()}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Box>

                    {/* Next Steps */}
                    <Card sx={{ bgcolor: 'primary.50', border: 1, borderColor: 'primary.200', mb: 4 }}>
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                          🎉 What's Next?
                        </Typography>
                        <Stack spacing={1} sx={{ textAlign: 'left' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ScheduleIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                            <Typography variant="body2">Complete your account setup in the dashboard</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SecurityIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                            <Typography variant="body2">Import your existing data and integrations</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SupportIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                            <Typography variant="body2">Access our onboarding resources and support</Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>

                    {/* Redirect Button */}
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForwardIcon />}
                      onClick={handleManualRedirect}
                      sx={{
                        py: 2,
                        px: 4,
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: 2,
                        mb: 2
                      }}
                    >
                      Go to Dashboard
                    </Button>

                    <Typography variant="body2" color="text.secondary">
                      Automatically redirecting in {countdown} seconds...
                    </Typography>
                  </Box>
                </Zoom>
              )}

              {/* Error State */}
              {!isVerifying && error && (
                <Fade in={true}>
                  <Box>
                    <ErrorAvatar>
                      <ErrorIcon sx={{ fontSize: 48, color: 'white' }} />
                    </ErrorAvatar>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: 'error.main' }}>
                      Verification Failed
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                      We encountered an issue while setting up your subscription
                    </Typography>

                    <Alert severity="error" sx={{ mb: 4, textAlign: 'left' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        Error Details:
                      </Typography>
                      <Typography variant="body2">{error}</Typography>
                    </Alert>

                    {/* Support Information */}
                    <Card sx={{ bgcolor: 'grey.50', mb: 4 }}>
                      <CardContent>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                          Need Help?
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Don't worry! Your payment was processed successfully. Our support team will help resolve this quickly.
                        </Typography>
                        <Stack spacing={1} sx={{ textAlign: 'left' }}>
                          <Typography variant="body2">📧 Email: support@allyvia.com</Typography>
                          <Typography variant="body2">📞 Phone: 1-800-ALLYVIA</Typography>
                          <Typography variant="body2">💬 Live Chat: Available 24/7</Typography>
                        </Stack>
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={2} justifyContent="center">
                      <Button variant="outlined" onClick={handleRetryPayment} sx={{ textTransform: 'none' }}>
                        Return to Plans
                      </Button>
                      <Button variant="contained" onClick={handleManualRedirect} sx={{ textTransform: 'none' }}>
                        Continue to Dashboard
                      </Button>
                    </Stack>
                  </Box>
                </Fade>
              )}
            </CardContent>
          </StyledCard>
        </Box>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Having trouble? Contact our support team at{' '}
            <Typography component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
              support@allyvia.com
            </Typography>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default CheckoutSuccessPage;
