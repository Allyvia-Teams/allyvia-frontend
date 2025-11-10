import { MouseEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

// third party
import * as Yup from 'yup';
import { Formik } from 'formik';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import useAuth from 'hooks/useAuth';
import useScriptRef from 'hooks/useScriptRef';
import ReCAPTCHA from 'react-google-recaptcha';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

// ===============================|| JWT - LOGIN ||=============================== //

export default function JWTLogin({ ...others }) {
  const theme = useTheme();

  const { login, isLoggedIn } = useAuth();
  const scriptedRef = useScriptRef();

  const [showPassword, setShowPassword] = useState(false);
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: MouseEvent) => {
    event.preventDefault()!;
  };

  const [searchParams] = useSearchParams();
  const authParam = searchParams.get('auth');

  // Check if mock mode is enabled
  const isMockMode = import.meta.env.VITE_USE_MOCK_API === 'true';
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    // Diagnostics: confirm env and script availability
    // Avoid logging the full key
    const keyPreview = siteKey ? `${siteKey.slice(0, 8)}... (${siteKey.length})` : 'undefined';
    // eslint-disable-next-line no-console
    console.log('[reCAPTCHA] type=v2-checkbox, siteKey:', keyPreview, 'hostname:', window.location.hostname);
    // eslint-disable-next-line no-console
    console.log('[reCAPTCHA] grecaptcha present:', !!(window as any).grecaptcha, 'enterprise:', !!(window as any).grecaptcha?.enterprise);
  }, [siteKey]);

  return (
    <>
      {isMockMode && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.dark' }}>
            Mock API Mode - Test Accounts:
          </Typography>
          <Typography variant="body2" sx={{ color: 'primary.dark' }}>
            • admin@allyvia.com / admin123 (Admin)
            <br />
            • manager@allyvia.com / manager123 (Manager)
            <br />
            • member@allyvia.com / member123 (Member)
            <br />
            • viewer@allyvia.com / viewer123 (Viewer)
            <br />• multi@allyvia.com / multi123 (Multi-role)
          </Typography>
        </Box>
      )}
      <Formik
        initialValues={{
          email: isMockMode ? 'admin@allyvia.com' : '',
          password: isMockMode ? 'admin123' : '',
          submit: null
        }}
        validationSchema={Yup.object().shape({
          email: Yup.string().email('Must be a valid email').max(255).required('Email is required'),
          password: Yup.string()
            .required('Password is required')
            .test('no-leading-trailing-whitespace', 'Password can not start or end with spaces', (value) => value === value.trim())
        })}
        onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
          try {
            if (siteKey && !recaptchaToken) {
              setErrors({ submit: 'Please complete the reCAPTCHA.' });
              setSubmitting(false);
              return;
            }
            const trimmedEmail = values.email.trim();
            await login?.(trimmedEmail, values.password, recaptchaToken);

            if (scriptedRef.current) {
              setStatus({ success: true });
              setSubmitting(false);
            }
          } catch (err: any) {
            setStatus({ success: false });
            // Error comes as a string from Redux rejectWithValue, not an object
            const errorMessage = typeof err === 'string' ? err : err.message || 'Login failed';
            setErrors({ submit: errorMessage });
            setSubmitting(false);
          }
        }}
      >
        {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
          <form noValidate onSubmit={handleSubmit} {...others}>
            <FormControl fullWidth error={Boolean(touched.email && errors.email)} sx={{ ...theme.typography.customInput }}>
              <InputLabel htmlFor="outlined-adornment-email-login">Email Address</InputLabel>
              <OutlinedInput
                id="outlined-adornment-email-login"
                type="email"
                value={values.email}
                name="email"
                onBlur={handleBlur}
                onChange={handleChange}
              />
              {touched.email && errors.email && (
                <FormHelperText error id="standard-weight-helper-text-email-login">
                  {errors.email}
                </FormHelperText>
              )}
            </FormControl>

            <FormControl fullWidth error={Boolean(touched.password && errors.password)} sx={{ ...theme.typography.customInput }}>
              <InputLabel htmlFor="outlined-adornment-password-login">Password</InputLabel>
              <OutlinedInput
                id="outlined-adornment-password-login"
                type={showPassword ? 'text' : 'password'}
                value={values.password}
                name="password"
                onBlur={handleBlur}
                onChange={handleChange}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                      size="large"
                    >
                      {showPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                }
                label="Password"
              />
              {touched.password && errors.password && (
                <FormHelperText error id="standard-weight-helper-text-password-login">
                  {errors.password}
                </FormHelperText>
              )}
            </FormControl>

            {siteKey && (
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', width: '100%' }}>
                <ReCAPTCHA
                  sitekey={siteKey}
                  onChange={(token) => {
                    // eslint-disable-next-line no-console
                    console.log('[reCAPTCHA] onChange token:', token ? `${String(token).slice(0, 8)}...` : null);
                    setRecaptchaToken(token);
                  }}
                  onExpired={() => {
                    // eslint-disable-next-line no-console
                    console.log('[reCAPTCHA] onExpired');
                    setRecaptchaToken(null);
                  }}
                  onErrored={() => {
                    // eslint-disable-next-line no-console
                    console.log('[reCAPTCHA] onErrored');
                  }}
                />
              </Box>
            )}

            {errors.submit && (
              <Box sx={{ mt: 1 }}>
                <FormHelperText error>{errors.submit}</FormHelperText>
              </Box>
            )}
            <Box sx={{ mt: 2 }}>
              <AnimateButton>
                <Button
                  color="primary"
                  disabled={isSubmitting}
                  fullWidth
                  size="large"
                  type="submit"
                  variant="contained"
                  sx={{ color: 'white' }}
                  startIcon={isSubmitting && <CircularProgress size={20} sx={{ color: 'white' }} />}
                >
                  {isSubmitting ? 'Signing In...' : 'Sign In'}
                </Button>
              </AnimateButton>
            </Box>
          </form>
        )}
      </Formik>
    </>
  );
}
