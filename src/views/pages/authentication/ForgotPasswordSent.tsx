import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

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
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import axiosServices from 'utils/axios';

export default function ForgotPasswordSent() {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const location = useLocation();
  const { email } = location.state || {};
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { canResend, countdown, triggerResend } = useResendTimer({
    cooldownSeconds: 30,
    storageKey: 'passwordResetResendTimestamp'
  });

  const displayEmail = email || sessionStorage.getItem('passwordResetEmail');

  const handleResend = async () => {
    if (!canResend || !displayEmail) return;

    setResending(true);
    setMessage(null);

    try {
      triggerResend();
      await axiosServices.post('/auth/forgot-password/', {
        email: displayEmail
      });

      setMessage({ type: 'success', text: 'Password reset email sent successfully!' });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to send email. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setResending(false);
    }
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
                          <MailOutlineIcon sx={{ fontSize: 80, color: 'primary.main' }} />
                        </Box>
                      </Grid>
                      <Grid size={12}>
                        <Typography gutterBottom variant={downMD ? 'h3' : 'h2'} sx={{ color: 'primary.main' }}>
                          Check Your Email
                        </Typography>
                      </Grid>
                      <Grid size={12}>
                        <Typography variant="body1" sx={{ fontSize: '16px', mb: 1 }}>
                          We've sent password reset instructions to:
                        </Typography>
                        {displayEmail && (
                          <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
                            {displayEmail}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ fontSize: '14px', color: 'text.secondary' }}>
                          Please check your email and click the link to reset your password.
                        </Typography>
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

                  <Grid size={12}>
                    <AnimateButton>
                      <Button
                        fullWidth
                        size="large"
                        variant="contained"
                        color="primary"
                        sx={{ color: 'white' }}
                        onClick={handleResend}
                        disabled={!canResend || resending || !displayEmail}
                        startIcon={resending && <CircularProgress size={20} />}
                      >
                        {!canResend ? `Resend in ${countdown}s` : resending ? 'Sending...' : "Didn't receive email? Resend"}
                      </Button>
                    </AnimateButton>
                  </Grid>

                  <Grid size={12}>
                    <Typography variant="body2" sx={{ textAlign: 'center' }}>
                      Remember your password?{' '}
                      <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>
                        Back to Login
                      </Link>
                    </Typography>
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
