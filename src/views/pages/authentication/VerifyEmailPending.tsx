import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

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
import { useResendTimer } from 'utils/resend-timer';

// assets
import EmailTwoToneIcon from '@mui/icons-material/EmailTwoTone';
import axiosServices from 'utils/axios';

export default function VerifyEmailPending() {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { email, existingUnverified } = location.state || {};
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Use 30 seconds cooldown for email verification
  const { canResend, countdown, triggerResend } = useResendTimer({
    cooldownSeconds: 30,
    storageKey: 'verificationResendTimestamp'
  });

  useEffect(() => {
    if (!email) {
      const savedEmail = sessionStorage.getItem('pendingVerificationEmail');
      if (!savedEmail) {
        navigate('/register', { replace: true });
      }
    } else {
      sessionStorage.setItem('pendingVerificationEmail', email);
    }
  }, [email, navigate]);

  const displayEmail = email || sessionStorage.getItem('pendingVerificationEmail');

  const handleResend = async () => {
    if (!canResend || !displayEmail) return;

    setResending(true);
    setMessage(null);

    try {
      triggerResend();
      const response = await axiosServices.post('/auth/resend-verification/', {
        email: displayEmail
      });

      setMessage({ type: 'success', text: 'Verification email sent successfully!' });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to send email. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setResending(false);
    }
  };

  const handleGoBack = () => {
    sessionStorage.removeItem('pendingVerificationEmail');
    navigate('/register', { state: { prefillEmail: displayEmail } });
  };

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
                      <Grid size={12}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                          <EmailTwoToneIcon sx={{ fontSize: 80, color: 'primary.main' }} />
                        </Box>
                      </Grid>
                      <Grid size={12}>
                        <Typography gutterBottom variant={downMD ? 'h3' : 'h2'} sx={{ color: 'primary.main' }}>
                          Check Your Email
                        </Typography>
                      </Grid>
                      <Grid size={12}>
                        {displayEmail ? (
                          <>
                            <Typography variant="body1" sx={{ fontSize: '16px', mb: 1 }}>
                              {existingUnverified
                                ? "Your account already existed but wasn't verified. We've sent a new verification email to:"
                                : "We've sent a verification email to:"}
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
                              {displayEmail}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '14px', color: 'text.secondary' }}>
                              Please click the link in the email to verify your account.
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body1" sx={{ fontSize: '16px' }}>
                            Something went wrong. Please try registering again.
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </Grid>

                  {message && (
                    <Grid size={12}>
                      <Alert
                        severity={message.type}
                        sx={{
                          width: '100%',
                          ...(message.type === 'success' && {
                            bgcolor: '#69a1ea',
                            color: 'white',
                            '& .MuiAlert-icon': {
                              color: 'white'
                            }
                          })
                        }}
                      >
                        {message.text}
                      </Alert>
                    </Grid>
                  )}

                  {displayEmail && (
                    <>
                      <Grid size={12}>
                        <AnimateButton>
                          <Button
                            fullWidth
                            size="large"
                            variant="contained"
                            color="primary"
                            sx={{ color: 'white' }}
                            onClick={handleResend}
                            disabled={!canResend || resending}
                            startIcon={resending && <CircularProgress size={20} />}
                          >
                            {resending ? 'Sending...' : !canResend ? `Resend in ${countdown}s` : "Didn't receive email? Resend"}
                          </Button>
                        </AnimateButton>
                      </Grid>

                      <Grid size={12}>
                        <Typography variant="body2" sx={{ textAlign: 'center' }}>
                          Wrong email?{' '}
                          <Link
                            to="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handleGoBack();
                            }}
                            style={{ color: 'inherit', fontWeight: 600 }}
                          >
                            Go back to correct it
                          </Link>
                        </Typography>
                      </Grid>
                    </>
                  )}
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
