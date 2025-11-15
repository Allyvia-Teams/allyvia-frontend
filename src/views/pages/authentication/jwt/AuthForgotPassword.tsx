import { useNavigate } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

// third party
import * as Yup from 'yup';
import { Formik } from 'formik';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';
import axiosServices from 'utils/axios';
import useScriptRef from 'hooks/useScriptRef';

// ========================|| JWT - FORGOT PASSWORD ||======================== //

export default function AuthForgotPassword({ ...others }: { link?: string }) {
  const theme = useTheme();
  const scriptedRef = useScriptRef();
  const navigate = useNavigate();

  return (
    <Formik
      initialValues={{
        email: '',
        submit: null
      }}
      validationSchema={Yup.object().shape({
        email: Yup.string().email('Must be a valid email').max(255).required('Email is required')
      })}
      onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
        try {
          await axiosServices.post('/auth/forgot-password/', {
            email: values.email.trim()
          });

          if (scriptedRef.current) {
            setStatus({ success: true });
            setSubmitting(false);
          }

          sessionStorage.setItem('passwordResetEmail', values.email.trim());

          navigate('/forgot-password-sent', {
            state: { email: values.email.trim() },
            replace: true
          });
        } catch (err: any) {
          console.error(err);
          if (scriptedRef.current) {
            setStatus({ success: false });
            const errorMessage = err.response?.data?.error || 'Failed to send reset email. Please try again.';
            setErrors({ submit: errorMessage });
            setSubmitting(false);
          }
        }
      }}
    >
      {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
        <form noValidate onSubmit={handleSubmit} {...others}>
          <FormControl fullWidth error={Boolean(touched.email && errors.email)} sx={{ ...theme.typography.customInput }}>
            <InputLabel htmlFor="outlined-adornment-email-forgot">Email Address</InputLabel>
            <OutlinedInput
              id="outlined-adornment-email-forgot"
              type="email"
              value={values.email}
              name="email"
              onBlur={handleBlur}
              onChange={handleChange}
              label="Email Address"
            />
            {touched.email && errors.email && (
              <FormHelperText error id="standard-weight-helper-text-email-forgot">
                {errors.email}
              </FormHelperText>
            )}
          </FormControl>

          {errors.submit && (
            <Box sx={{ mt: 3 }}>
              <FormHelperText error>{errors.submit}</FormHelperText>
            </Box>
          )}

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
                {isSubmitting ? 'Sending...' : 'Send Mail'}
              </Button>
            </AnimateButton>
          </Box>
        </form>
      )}
    </Formik>
  );
}
