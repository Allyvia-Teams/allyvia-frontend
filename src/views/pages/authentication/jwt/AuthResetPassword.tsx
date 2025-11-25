import { SyntheticEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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

// third party
import * as Yup from 'yup';
import { Formik } from 'formik';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import { strengthColor, strengthIndicator } from 'utils/password-strength';
import axiosServices from 'utils/axios';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

// types
import { StringColorProps } from 'types';

// ========================|| JWT - RESET PASSWORD ||======================== //

export default function AuthResetPassword({ ...others }: { link?: string }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [level, setLevel] = useState<StringColorProps>();
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(true);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleMouseDownPassword = (event: SyntheticEvent) => {
    event.preventDefault();
  };

  const changePassword = (value: string) => {
    const temp = strengthIndicator(value);
    setLevel(strengthColor(temp));
  };

  useEffect(() => {
    changePassword('');
  }, []);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setVerifying(false);
      return;
    }
    setTokenValid(true);
    setVerifying(false);
  }, [token]);

  if (verifying) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!tokenValid) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Invalid or expired password reset link. Please request a new one.
        </Alert>
        <AnimateButton>
          <Button
            fullWidth
            size="large"
            variant="contained"
            color="primary"
            sx={{ color: 'white' }}
            onClick={() => navigate('/forgot-password')}
          >
            Request New Reset Link
          </Button>
        </AnimateButton>
      </Box>
    );
  }

  return (
    <Formik
      initialValues={{
        password: '',
        confirmPassword: '',
        submit: null
      }}
      validationSchema={Yup.object().shape({
        password: Yup.string()
          .min(8, 'Password must be at least 8 characters')
          .max(255)
          .required('Password is required')
          .matches(/^(?!^\d+$).*$/, 'Password cannot be entirely numeric'),
        confirmPassword: Yup.string()
          .required('Confirm Password is required')
          .test('confirmPassword', 'Both passwords must match!', (confirmPassword, yup) => yup.parent.password === confirmPassword)
      })}
      onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
        if (!token) {
          setErrors({ submit: 'Invalid reset token' });
          return;
        }

        try {
          await axiosServices.post('/auth/reset-password/', {
            token,
            password: values.password,
            password_confirm: values.confirmPassword
          });

          setStatus({ success: true });
          setSubmitting(false);

          dispatch(
            openSnackbar({
              open: true,
              message: 'Password reset successfully!',
              variant: 'alert',
              alert: {
                color: 'success'
              },
              anchorOrigin: {
                vertical: 'top',
                horizontal: 'right'
              },
              close: true,
              customSx: {
                bgcolor: '#69a1ea',
                color: 'white',
                '& .MuiAlert-icon': {
                  color: 'white'
                }
              }
            })
          );

          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 1500);
        } catch (err: any) {
          console.error(err);
          setStatus({ success: false });
          let errorMessage = 'Failed to reset password. Please try again.';

          if (err.response?.data) {
            const data = err.response.data;
            if (data.error) {
              errorMessage = data.error;
            } else if (data.password) {
              errorMessage = Array.isArray(data.password) ? data.password.join(' ') : data.password;
            } else if (data.password_confirm) {
              errorMessage = Array.isArray(data.password_confirm) ? data.password_confirm.join(' ') : data.password_confirm;
            } else if (data.non_field_errors) {
              errorMessage = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : data.non_field_errors;
            }
          }

          setErrors({ submit: errorMessage });
          setSubmitting(false);
        }
      }}
    >
      {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
        <form noValidate onSubmit={handleSubmit} {...others}>
          <FormControl fullWidth error={Boolean(touched.password && errors.password)} sx={{ ...theme.typography.customInput }}>
            <InputLabel htmlFor="outlined-adornment-password-reset">Password</InputLabel>
            <OutlinedInput
              id="outlined-adornment-password-reset"
              type={showPassword ? 'text' : 'password'}
              value={values.password}
              name="password"
              onBlur={handleBlur}
              onChange={(e) => {
                handleChange(e);
                changePassword(e.target.value);
              }}
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
            />
          </FormControl>
          {touched.password && errors.password && (
            <FormControl fullWidth>
              <FormHelperText error id="standard-weight-helper-text-reset">
                {errors.password}
              </FormHelperText>
            </FormControl>
          )}

          <FormControl
            fullWidth
            error={Boolean(touched.confirmPassword && errors.confirmPassword)}
            sx={{ ...theme.typography.customInput }}
          >
            <InputLabel htmlFor="outlined-adornment-confirm-password">Confirm Password</InputLabel>
            <OutlinedInput
              id="outlined-adornment-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={values.confirmPassword}
              name="confirmPassword"
              label="Confirm Password"
              onBlur={handleBlur}
              onChange={handleChange}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle confirm password visibility"
                    onClick={handleClickShowConfirmPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                    size="large"
                  >
                    {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>

          {touched.confirmPassword && errors.confirmPassword && (
            <FormControl fullWidth>
              <FormHelperText error id="standard-weight-helper-text-confirm-password">
                {' '}
                {errors.confirmPassword}{' '}
              </FormHelperText>
            </FormControl>
          )}

          {values.password.length > 0 && (
            <FormControl fullWidth>
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid>
                    <Box
                      sx={{
                        width: 85,
                        height: 8,
                        borderRadius: '7px',
                        bgcolor: level?.color
                      }}
                    />
                  </Grid>
                  <Grid>
                    <Typography variant="subtitle1" sx={{ fontSize: '0.75rem' }}>
                      {level?.label}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </FormControl>
          )}

          {errors.submit && (
            <Box sx={{ mt: 3 }}>
              <FormHelperText error>{errors.submit}</FormHelperText>
            </Box>
          )}
          <Box sx={{ mt: 1 }}>
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
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </Button>
            </AnimateButton>
          </Box>
        </form>
      )}
    </Formik>
  );
}
