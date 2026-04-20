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
import { acceptInvitation } from 'api/invitation';

// assets
import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default function AcceptInvitation() {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [processing, setProcessing] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [successDetail, setSuccessDetail] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setProcessing(false);
      return;
    }

    const run = async () => {
      try {
        const data = await acceptInvitation(token);
        setSuccessDetail(data.detail || 'Invitation accepted.');
        setAccepted(true);
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.detail || err.response?.data?.error || 'Unable to accept invitation. The link may be invalid or expired.';
        setError(errorMessage);
      } finally {
        setProcessing(false);
      }
    };

    run();
  }, [token]);

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
                      {processing ? (
                        <>
                          <Grid size={12}>
                            <CircularProgress size={60} sx={{ color: 'primary.main' }} />
                          </Grid>
                          <Grid size={12}>
                            <Typography variant="h3" sx={{ color: 'primary.main', mt: 2 }}>
                              Accepting Your Invitation...
                            </Typography>
                          </Grid>
                        </>
                      ) : accepted ? (
                        <>
                          <Grid size={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                              <CheckCircle sx={{ fontSize: 80, color: 'primary.main' }} />
                            </Box>
                          </Grid>
                          <Grid size={12}>
                            <Typography gutterBottom variant={downMD ? 'h3' : 'h2'} sx={{ color: 'primary.main' }}>
                              Invitation Accepted!
                            </Typography>
                          </Grid>
                          <Grid size={12}>
                            <Typography variant="body1" sx={{ fontSize: '16px', mb: 2 }}>
                              {successDetail}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: '14px', color: 'text.secondary' }}>
                              If this is your first time, please check your email for a password setup link. Otherwise, log in to continue.
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
                                onClick={() => navigate('/login', { replace: true })}
                              >
                                Go to Login
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
                              Unable to Accept
                            </Typography>
                          </Grid>
                          <Grid size={12}>
                            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                              {error || 'The invitation link is invalid or has expired.'}
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
                                to="/login"
                              >
                                Go to Login
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
