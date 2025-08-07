import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { TablerIconsProps } from '@tabler/icons-react';
import { IconUser, IconMail, IconLock, IconBuilding, IconCheck } from '@tabler/icons-react';

interface SignupLinkData {
  email: string;
  plan: string;
  token: string;
  signup_url: string;
  created_at: string;
  expires_at: string;
  is_used: boolean;
}

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
}

const SignupWithToken: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signupLinkData, setSignupLinkData] = useState<SignupLinkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: ''
  });

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No signup token provided');
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setValidating(true);
      const response = await fetch(`/api/v1/invitation/validate/${token}/`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid signup link');
      }

      const data = await response.json();
      setSignupLinkData(data);
      
      // Pre-fill email from token
      setFormData(prev => ({
        ...prev,
        email: data.email
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate signup link');
    } finally {
      setLoading(false);
      setValidating(false);
    }
  };

  const handleInputChange = (field: keyof SignupFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    if (!formData.companyName.trim()) return 'Company name is required';
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      enqueueSnackbar(validationError, { variant: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      
      // First, mark the token as used
      const useResponse = await fetch(`/api/v1/invitation/use/${token}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!useResponse.ok) {
        throw new Error('Failed to validate signup link');
      }

      // Create user account
      const signupResponse = await fetch('/api/v1/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: formData.password,
          company_name: formData.companyName,
          plan: signupLinkData?.plan || 'basic'
        })
      });

      if (!signupResponse.ok) {
        const errorData = await signupResponse.json();
        throw new Error(errorData.error || 'Failed to create account');
      }

      enqueueSnackbar('Account created successfully! Welcome to Allyvia!', { variant: 'success' });
      
      // Redirect to login or dashboard
      navigate('/login');
      
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to create account', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ['Validate Link', 'Account Details', 'Complete Setup'];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              {validating ? 'Validating your signup link...' : 'Loading...'}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
              fullWidth
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        py: 4
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
              Welcome to Allyvia! 🎉
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Complete your account setup to get started
            </Typography>
          </Box>

          {/* Plan Information */}
          {signupLinkData && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Chip
                    label={signupLinkData.plan.toUpperCase()}
                    color="primary"
                    variant="filled"
                  />
                </Grid>
                <Grid item xs>
                  <Typography variant="body2" color="text.secondary">
                    You've selected the <strong>{signupLinkData.plan}</strong> plan
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Divider sx={{ mb: 4 }} />

          {/* Signup Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={formData.firstName}
                  onChange={handleInputChange('firstName')}
                  required
                  InputProps={{
                    startAdornment: <IconUser size={20} style={{ marginRight: 8 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={formData.lastName}
                  onChange={handleInputChange('lastName')}
                  required
                  InputProps={{
                    startAdornment: <IconUser size={20} style={{ marginRight: 8 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  required
                  disabled
                  InputProps={{
                    startAdornment: <IconMail size={20} style={{ marginRight: 8 }} />
                  }}
                  helperText="Email is pre-filled from your payment"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={formData.companyName}
                  onChange={handleInputChange('companyName')}
                  required
                  InputProps={{
                    startAdornment: <IconBuilding size={20} style={{ marginRight: 8 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  required
                  InputProps={{
                    startAdornment: <IconLock size={20} style={{ marginRight: 8 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange('confirmPassword')}
                  required
                  InputProps={{
                    startAdornment: <IconLock size={20} style={{ marginRight: 8 }} />
                  }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} /> : <IconCheck size={20} />}
                sx={{ minWidth: 200 }}
              >
                {submitting ? 'Creating Account...' : 'Complete Setup'}
              </Button>
            </Box>
          </Box>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Button
                variant="text"
                onClick={() => navigate('/login')}
                sx={{ p: 0, minWidth: 'auto' }}
              >
                Sign in
              </Button>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SignupWithToken; 