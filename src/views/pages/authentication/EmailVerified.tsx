import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// project imports
import AuthWrapper1 from './AuthWrapper1';
import AuthCardWrapper from './AuthCardWrapper';
import Logo from 'ui-component/Logo';
import AnimateButton from 'ui-component/extended/AnimateButton';
import AuthFooter from 'ui-component/cards/AuthFooter';
import axiosServices from 'utils/axios';
import { useDispatch } from 'store';
import { loginSuccess } from 'store/slices/auth';
import useAuth from 'hooks/useAuth';

// assets
import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default function EmailVerified() {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoggedIn } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid verification link');
      setVerifying(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await axiosServices.post('/auth/verify-email/', { token });

        if (response.data.access && response.data.refresh) {
          dispatch(
            loginSuccess({
              user: {
                id: response.data.user_id,
                email: response.data.email,
                first_name: response.data.first_name,
                last_name: response.data.last_name,
                email_verified: response.data.email_verified
              },
              roles: response.data.roles || [],
              access: response.data.access,
              refresh: response.data.refresh
            })
          );

          setVerified(true);
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Failed to verify email. Please try again.';
        setError(errorMessage);
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [token, dispatch]);

  // Navigate to paywall after login state is confirmed (follows GuestGuard pattern)
  useEffect(() => {
    if (verified && isLoggedIn) {
      navigate('/paymentplan', { replace: true });
    }
  }, [verified, isLoggedIn, navigate]);

  return (
    <AuthWrapper1>
      <Grid container direction="column" sx={{ justifyContent: 'flex-end', minHeight: '100vh' }}>
        <Grid size={12}>
          <Grid container sx={{ justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 68px)' }}>
            <Grid sx={{ m: { xs: 1, sm: 3 }, mb: 0 }}>
              <AuthCardWrapper>
                <Grid container spacing={3} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Grid sx={{ mb: 3 }}>
                    <Link to="#" aria-label="theme logo">
                      <Logo collapsed={false} />
                    </Link>
                  </Grid>
                  <Grid size={12}>
                    <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                      {verifying ? (
                        <>
                          <Grid size={12}>
                            <CircularProgress size={60} sx={{ color: 'primary.main' }} />
                          </Grid>
                          <Grid size={12}>
                            <Typography variant="h3" sx={{ color: 'primary.main', mt: 2 }}>
                              Verifying Your Email...
                            </Typography>
                          </Grid>
                        </>
                      ) : verified ? (
                        <>
                          <Grid size={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                              <CheckCircle sx={{ fontSize: 80, color: 'primary.main' }} />
                            </Box>
                          </Grid>
                          <Grid size={12}>
                            <Typography gutterBottom variant={downMD ? 'h3' : 'h2'} sx={{ color: 'primary.main' }}>
                              Email Verified!
                            </Typography>
                          </Grid>
                          <Grid size={12}>
                            <Typography variant="body1" sx={{ fontSize: '16px', mb: 2 }}>
                              Your email has been successfully verified.
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '14px', color: 'text.secondary' }}>
                              Redirecting to dashboard...
                            </Typography>
                          </Grid>
                          <Grid size={12}>
                            <AnimateButton>
                              <Button
                                fullWidth
                                size="large"
                                variant="contained"
                                color="primary"
                                sx={{ color: 'white' }}
                                onClick={() => navigate('/paymentplan', { replace: true })}
                              >
                                Continue to Dashboard
                              </Button>
                            </AnimateButton>
                          </Grid>
                        </>
                      ) : (
                        <>
                          <Grid size={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                              <ErrorOutlineIcon sx={{ fontSize: 80, color: 'error.main' }} />
                            </Box>
                          </Grid>
                          <Grid size={12}>
                            <Typography gutterBottom variant={downMD ? 'h3' : 'h2'} sx={{ color: 'error.main' }}>
                              Verification Failed
                            </Typography>
                          </Grid>
                          <Grid size={12}>
                            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                              {error || 'Unable to verify your email. The link may be invalid or expired.'}
                            </Alert>
                          </Grid>
                          <Grid size={12}>
                            <AnimateButton>
                              <Button
                                fullWidth
                                size="large"
                                variant="contained"
                                color="primary"
                                sx={{ color: 'white' }}
                                component={Link}
                                to="/register"
                              >
                                Back to Registration
                              </Button>
                            </AnimateButton>
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </Grid>
                </Grid>
              </AuthCardWrapper>
            </Grid>
          </Grid>
        </Grid>
        <Grid sx={{ px: 3, my: 3 }} size={12}>
          <AuthFooter />
        </Grid>
      </Grid>
    </AuthWrapper1>
  );
}
