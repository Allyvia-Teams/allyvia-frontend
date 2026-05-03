import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

// third party
import * as Yup from 'yup';
import { Formik } from 'formik';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import useAuth from 'hooks/useAuth';

export default function AuthTwoFactorVerify({ ...others }: { link?: string }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pending2fa, isLoggedIn, verifyTwoFactor } = useAuth();

  // If the user landed here without a pending 2FA session (refresh, direct
  // URL, etc.), send them back to log in — but NOT right after a successful
  // verification, when pending2fa has just been cleared and isLoggedIn has
  // flipped to true. In that case, let GuestGuard route them onward.
  useEffect(() => {
    if (!pending2fa?.token && !isLoggedIn) {
      navigate('/login', { replace: true });
    }
  }, [pending2fa, isLoggedIn, navigate]);

  if (!pending2fa?.token) {
    return null;
  }

  return (
    <Formik
      initialValues={{ code: '', submit: null }}
      validationSchema={Yup.object().shape({
        code: Yup.string()
          .required('Verification code is required')
          .matches(/^([0-9]{6}|[0-9a-f]{4}-[0-9a-f]{4})$/i, 'Enter a 6-digit code or backup code (xxxx-xxxx)')
      })}
      onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
        try {
          await verifyTwoFactor(pending2fa.token, values.code.trim());
          setStatus({ success: true });
          setSubmitting(false);
          // Don't navigate explicitly — once Redux flips isLoggedIn to true,
          // GuestGuard (wrapping this route) will redirect to DASHBOARD_PATH
          // on its own. Calling navigate here caused a race that sometimes
          // bounced the user back to /login.
        } catch (err: any) {
          const errorMessage = typeof err === 'string' ? err : err?.message || 'Invalid verification code';
          setErrors({ submit: errorMessage });
          setStatus({ success: false });
          setSubmitting(false);
        }
      }}
    >
      {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
        <form noValidate onSubmit={handleSubmit} {...others}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Enter the 6-digit code from your authenticator app, or use one of your backup codes.
          </Alert>

          <FormControl
            fullWidth
            error={Boolean(touched.code && errors.code)}
            sx={{ ...theme.typography.customInput }}
          >
            <InputLabel htmlFor="outlined-adornment-2fa-code">Verification code</InputLabel>
            <OutlinedInput
              id="outlined-adornment-2fa-code"
              type="text"
              autoComplete="one-time-code"
              inputProps={{ inputMode: 'text', autoCapitalize: 'off', spellCheck: false }}
              value={values.code}
              name="code"
              onBlur={handleBlur}
              onChange={handleChange}
            />
          </FormControl>
          {touched.code && errors.code && (
            <FormControl fullWidth>
              <FormHelperText error>{errors.code}</FormHelperText>
            </FormControl>
          )}

          {errors.submit && (
            <Box sx={{ mt: 2 }}>
              <FormHelperText error>{errors.submit}</FormHelperText>
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Signing in as <strong>{pending2fa.email}</strong>
            </Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <AnimateButton>
              <Button
                disableElevation
                disabled={isSubmitting}
                fullWidth
                size="large"
                type="submit"
                variant="contained"
                color="primary"
                sx={{ color: 'white' }}
                startIcon={isSubmitting && <CircularProgress size={20} sx={{ color: 'white' }} />}
              >
                {isSubmitting ? 'Verifying...' : 'Verify and sign in'}
              </Button>
            </AnimateButton>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              onClick={() => navigate('/login', { replace: true })}
              size="small"
              color="inherit"
            >
              Back to login
            </Button>
          </Box>
        </form>
      )}
    </Formik>
  );
}
