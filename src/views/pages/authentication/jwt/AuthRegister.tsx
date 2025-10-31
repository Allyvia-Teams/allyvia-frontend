import { SyntheticEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// import { useDispatch } from 'store';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import TextField from '@mui/material/TextField';
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
import { strengthColor, strengthIndicator } from 'utils/password-strength';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

// types
import { StringColorProps } from 'types';

// ===========================|| JWT - REGISTER ||=========================== //

export default function JWTRegister({ ...others }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const scriptedRef = useScriptRef();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checked, setChecked] = useState(false);

  const [strength, setStrength] = useState(0);
  const [level, setLevel] = useState<StringColorProps>();
  const { register } = useAuth();

  const savedData = sessionStorage.getItem('registrationData');
  const initialData = savedData ? JSON.parse(savedData) : null;

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleMouseDownPassword = (event: SyntheticEvent) => {
    event.preventDefault();
  };

  const handleMouseDownConfirmPassword = (event: SyntheticEvent) => {
    event.preventDefault();
  };

  const changePassword = (value: string) => {
    const temp = strengthIndicator(value);
    setStrength(temp);
    setLevel(strengthColor(temp));
  };

  useEffect(() => {
    changePassword('123456');
  }, []);

  return (
    <>
      <Grid container direction="column" spacing={2} sx={{ justifyContent: 'center' }}></Grid>
      <Formik
        initialValues={{
          email: initialData?.email || '',
          password: '',
          confirmPassword: '',
          firstName: initialData?.firstName || '',
          lastName: initialData?.lastName || '',
          companyName: initialData?.companyName || '',
          terms: false,
          submit: null
        }}
        validationSchema={Yup.object().shape({
          firstName: Yup.string().max(50).required('First Name is required'),
          lastName: Yup.string().max(50).required('Last Name is required'),
          companyName: Yup.string().min(3, 'Company name must be at least 3 characters').max(255).required('Company Name is required'),
          email: Yup.string().email('Must be a valid email').max(255).required('Email is required'),
          password: Yup.string()
            .required('Password is required')
            .test('no-leading-trailing-whitespace', 'Password can not start or end with spaces', (value) => value === value.trim())
            .min(8, 'Password must be at least 8 characters')
            .max(32, 'Password must be 32 characters or less'),
          confirmPassword: Yup.string()
            .required('Confirm Password is required')
            .oneOf([Yup.ref('password'), ''], 'Passwords must match'),
          terms: Yup.boolean()
            .oneOf([true], 'You must accept the terms and conditions')
            .required('You must accept the terms and conditions')
        })}
        onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
          try {
            const trimmedEmail = values.email.trim();
            const result = await register(
              trimmedEmail,
              values.password,
              values.confirmPassword,
              values.firstName,
              values.lastName,
              values.companyName
            );

            if (scriptedRef.current) {
              setStatus({ success: true });
              setSubmitting(false);
            }

            sessionStorage.setItem(
              'registrationData',
              JSON.stringify({
                firstName: values.firstName,
                lastName: values.lastName,
                companyName: values.companyName,
                email: trimmedEmail
              })
            );

            const navigationState: any = { email: trimmedEmail };
            if ((result as any)?.existingUnverified) {
              navigationState.existingUnverified = true;
            }

            navigate('/verify-email-pending', {
              state: navigationState,
              replace: true
            });
          } catch (err: any) {
            setStatus({ success: false });
            const errorMessage = typeof err === 'string' ? err : err.message || 'Registration failed';
            setErrors({ submit: errorMessage });
            setSubmitting(false);
          }
        }}
      >
        {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values, isValid, setFieldValue }) => (
          <form noValidate onSubmit={handleSubmit} {...others}>
            <Grid container spacing={{ xs: 0, sm: 2 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  margin="normal"
                  name="firstName"
                  type="text"
                  value={values.firstName}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  error={Boolean(touched.firstName && errors.firstName)}
                  helperText={touched.firstName && errors.firstName ? String(errors.firstName) : ''}
                  sx={{ ...theme.typography.customInput }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Last Name"
                  margin="normal"
                  name="lastName"
                  type="text"
                  value={values.lastName}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  error={Boolean(touched.lastName && errors.lastName)}
                  helperText={touched.lastName && errors.lastName ? String(errors.lastName) : ''}
                  sx={{ ...theme.typography.customInput }}
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="Company Name"
              margin="normal"
              name="companyName"
              type="text"
              value={values.companyName}
              onBlur={handleBlur}
              onChange={handleChange}
              error={Boolean(touched.companyName && errors.companyName)}
              helperText={touched.companyName && errors.companyName ? String(errors.companyName) : ''}
              sx={{ ...theme.typography.customInput }}
            />
            <FormControl fullWidth error={Boolean(touched.email && errors.email)} sx={{ ...theme.typography.customInput }}>
              <InputLabel htmlFor="outlined-adornment-email-register">Email Address</InputLabel>
              <OutlinedInput
                id="outlined-adornment-email-register"
                type="email"
                value={values.email}
                name="email"
                onBlur={handleBlur}
                onChange={handleChange}
              />
              {touched.email && errors.email && (
                <FormHelperText error id="standard-weight-helper-text--register">
                  {String(errors.email)}
                </FormHelperText>
              )}
            </FormControl>

            <FormControl fullWidth error={Boolean(touched.password && errors.password)} sx={{ ...theme.typography.customInput }}>
              <InputLabel htmlFor="outlined-adornment-password-register">Password</InputLabel>
              <OutlinedInput
                id="outlined-adornment-password-register"
                type={showPassword ? 'text' : 'password'}
                value={values.password}
                name="password"
                label="Password"
                autoComplete="new-password"
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
              {touched.password && errors.password && (
                <FormHelperText error id="standard-weight-helper-text-password-register">
                  {errors.password}
                </FormHelperText>
              )}
            </FormControl>

            <FormControl
              fullWidth
              error={Boolean(touched.confirmPassword && errors.confirmPassword)}
              sx={{ ...theme.typography.customInput }}
            >
              <InputLabel htmlFor="outlined-adornment-confirm-password-register">Confirm Password</InputLabel>
              <OutlinedInput
                id="outlined-adornment-confirm-password-register"
                type={showConfirmPassword ? 'text' : 'password'}
                value={values.confirmPassword}
                name="confirmPassword"
                label="Confirm Password"
                autoComplete="new-password"
                onBlur={handleBlur}
                onChange={(e) => handleChange(e)}
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
              />
              {touched.confirmPassword && errors.confirmPassword && (
                <FormHelperText error id="standard-weight-helper-text-confirm-password-register">
                  {errors.confirmPassword}
                </FormHelperText>
              )}
            </FormControl>

            {values.password.length > 0 && (
              <FormControl fullWidth>
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                    <Grid>
                      <Box sx={{ width: 85, height: 8, borderRadius: '7px', bgcolor: level?.color }} />
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

            <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Grid>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={values.terms}
                      onChange={(event) => {
                        setFieldValue('terms', event.target.checked);
                        setChecked(event.target.checked);
                      }}
                      name="terms"
                      color="primary"
                      sx={{
                        '&:not(.Mui-checked)': {
                          color: 'primary.main'
                        },
                        '& .MuiSvgIcon-root': {
                          borderColor: 'primary.main'
                        }
                      }}
                    />
                  }
                  label={
                    <Typography variant="subtitle1" color="primary">
                      Agree with &nbsp;
                      <Typography variant="subtitle1" component={Link} to="#" color="primary">
                        Terms & Conditions
                      </Typography>
                    </Typography>
                  }
                />
                {touched.terms && errors.terms && (
                  <FormHelperText error sx={{ ml: 2 }}>
                    {String(errors.terms)}
                  </FormHelperText>
                )}
              </Grid>
            </Grid>
            {errors.submit && (
              <Box sx={{ mt: 1 }}>
                <FormHelperText error>{String(errors.submit)}</FormHelperText>
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <AnimateButton>
                <Button
                  disableElevation
                  disabled={isSubmitting || !values.terms || !isValid}
                  fullWidth
                  size="large"
                  type="submit"
                  variant="contained"
                  color="primary"
                  sx={{ color: 'white' }}
                  startIcon={isSubmitting && <CircularProgress size={20} sx={{ color: 'white' }} />}
                >
                  {isSubmitting ? 'Signing up...' : 'Sign up'}
                </Button>
              </AnimateButton>
            </Box>
          </form>
        )}
      </Formik>
    </>
  );
}
