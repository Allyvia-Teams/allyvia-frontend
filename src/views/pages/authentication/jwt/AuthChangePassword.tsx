import { SyntheticEvent, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
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
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';

// third party
import * as Yup from 'yup';
import { Formik } from 'formik';

// project imports
import useScriptRef from 'hooks/useScriptRef';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';
import { changePasswordAsync } from 'store/slices/auth';
import { useSelector } from 'store';
import AuthWrapper1 from '../AuthWrapper1';
import AuthCardWrapper from '../AuthCardWrapper';
import Logo from 'ui-component/Logo';
import AuthFooter from 'ui-component/cards/AuthFooter';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

// ========================|| JWT - CHANGE PASSWORD ||======================== //

export default function AuthChangePassword({ ...others }: { link?: string }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const scriptedRef = useScriptRef();
  const { mustChangePassword, isLoading } = useSelector((state) => state.auth);
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect if not required to change password
  useEffect(() => {
    if (!mustChangePassword) {
      navigate('/login', { replace: true });
    }
  }, [mustChangePassword, navigate]);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: SyntheticEvent) => {
    event.preventDefault();
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleMouseDownConfirmPassword = (event: SyntheticEvent) => {
    event.preventDefault();
  };

  return (
    <AuthWrapper1>
      <Grid container direction="column" sx={{ justifyContent: 'flex-end', minHeight: '100vh' }}>
        <Grid size={12}>
          <Grid container sx={{ justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 68px)' }}>
            <Grid sx={{ m: { xs: 1, sm: 3 }, mb: 0 }}>
              <AuthCardWrapper>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Grid sx={{ mb: 3 }}>
                    <Link to="#" aria-label="logo">
                      <Logo collapsed={false} />
                    </Link>
                  </Grid>
                  <Grid size={12}>
                    <Grid container direction={{ xs: 'column-reverse', md: 'row' }} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                      <Grid>
                        <Stack spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Typography gutterBottom variant={downMD ? 'h3' : 'h2'} sx={{ color: 'primary.main' }}>
                            Change Your Password
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '16px', textAlign: { xs: 'center', md: 'inherit' } }}>
                            Please set a new password for your account
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '14px', color: 'text.secondary', mt: 1, display: 'block' }}>
                            Password must be at least 8 characters with uppercase, lowercase, number, and special character
                          </Typography>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid size={12}>
                    <Formik
                      initialValues={{
                        password: '',
                        confirmPassword: '',
                        submit: ''
                      }}
                      validationSchema={Yup.object().shape({
                        password: Yup.string()
                          .min(8, 'Password must be at least 8 characters')
                          .matches(
                            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
                          )
                          .required('Password is required'),
                        confirmPassword: Yup.string()
                          .required('Confirm Password is required')
                          .test('passwords-match', 'Passwords do not match', function (value) {
                            return this.parent.password === value;
                          }),
                        submit: Yup.string()
                      })}
                      onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
                        try {
                          await dispatch(
                            changePasswordAsync({
                              password: values.password,
                              passwordConfirm: values.confirmPassword
                            })
                          ).unwrap();

                          setStatus({ success: true });
                          setSubmitting(false);

                          dispatch(
                            openSnackbar({
                              open: true,
                              message: 'Password changed successfully. Please log in again.',
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
                          let errorMessage = 'Failed to change password. Please try again.';

                          if (err.response?.data) {
                            const data = err.response.data;
                            if (data.non_field_errors) {
                              errorMessage = Array.isArray(data.non_field_errors)
                                ? data.non_field_errors.join(', ')
                                : data.non_field_errors;
                            } else if (data.error) {
                              errorMessage = data.error;
                            } else if (data.message) {
                              errorMessage = data.message;
                            }
                          }

                          setErrors({ submit: errorMessage });
                          setSubmitting(false);
                        }
                      }}
                    >
                      {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
                        <form noValidate onSubmit={handleSubmit} {...others}>
                          <Grid container spacing={2}>
                            <Grid size={12}>
                              <FormControl
                                fullWidth
                                error={Boolean(touched.password && errors.password)}
                                sx={{ ...theme.typography.customInput }}
                              >
                                <InputLabel htmlFor="outlined-adornment-password-change">New Password</InputLabel>
                                <OutlinedInput
                                  id="outlined-adornment-password-change"
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
                                  inputProps={{}}
                                />
                                {touched.password && errors.password && (
                                  <FormHelperText error id="standard-weight-helper-text-password-change">
                                    {errors.password}
                                  </FormHelperText>
                                )}
                                {touched.password && !errors.password && values.password && (
                                  <FormHelperText sx={{ color: 'success.main' }}>✓ Password meets requirements</FormHelperText>
                                )}
                              </FormControl>
                            </Grid>
                            <Grid size={12}>
                              <FormControl
                                fullWidth
                                error={Boolean(touched.confirmPassword && errors.confirmPassword)}
                                sx={{ ...theme.typography.customInput }}
                              >
                                <InputLabel htmlFor="outlined-adornment-confirm-password-change">Confirm Password</InputLabel>
                                <OutlinedInput
                                  id="outlined-adornment-confirm-password-change"
                                  type={showConfirmPassword ? 'text' : 'password'}
                                  value={values.confirmPassword}
                                  name="confirmPassword"
                                  onBlur={handleBlur}
                                  onChange={handleChange}
                                  endAdornment={
                                    <InputAdornment position="end">
                                      <IconButton
                                        aria-label="toggle confirm password visibility"
                                        onClick={handleClickShowConfirmPassword}
                                        onMouseDown={handleMouseDownConfirmPassword}
                                        edge="end"
                                        size="large"
                                      >
                                        {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                                      </IconButton>
                                    </InputAdornment>
                                  }
                                  inputProps={{}}
                                />
                                {touched.confirmPassword && errors.confirmPassword && (
                                  <FormHelperText error id="standard-weight-helper-text-confirm-password-change">
                                    {errors.confirmPassword}
                                  </FormHelperText>
                                )}
                                {touched.confirmPassword &&
                                  !errors.confirmPassword &&
                                  values.confirmPassword &&
                                  values.password === values.confirmPassword && (
                                    <FormHelperText sx={{ color: 'success.main' }}>✓ Passwords match</FormHelperText>
                                  )}
                              </FormControl>
                            </Grid>
                            {errors.submit && (
                              <Grid size={12}>
                                <Alert severity="error" sx={{ width: '100%' }}>
                                  {errors.submit}
                                </Alert>
                              </Grid>
                            )}
                            <Grid size={12}>
                              <AnimateButton>
                                <Button
                                  disableElevation
                                  disabled={isSubmitting || isLoading}
                                  fullWidth
                                  size="large"
                                  type="submit"
                                  variant="contained"
                                  color="primary"
                                  sx={{ color: 'white' }}
                                >
                                  Change Password
                                </Button>
                              </AnimateButton>
                            </Grid>
                          </Grid>
                        </form>
                      )}
                    </Formik>
                  </Grid>
                  <Grid size={12}>
                    <Divider />
                  </Grid>
                  <Grid size={12}>
                    <Grid container direction="column" sx={{ alignItems: 'center' }} size={12} spacing={1}>
                      <Grid>
                        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                          <Typography component={Link} to="/login" variant="subtitle1" color="primary" sx={{ textDecoration: 'none' }}>
                            Back to Login
                          </Typography>
                        </Stack>
                      </Grid>
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
