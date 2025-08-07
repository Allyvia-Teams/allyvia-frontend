import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { IconMail, IconSend, IconCopy } from '@tabler/icons-react';

interface InvitationResponse {
  email: string;
  plan: string;
  token: string;
  signup_url: string;
  created_at: string;
  expires_at: string;
  is_used: boolean;
}

const EmailInvitation: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<InvitationResponse | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!email.trim()) {
      enqueueSnackbar('Please enter an email address', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/v1/invitation/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          plan: plan,
          wix_order_id: `test-order-${Date.now()}`,
          wix_payment_id: `test-payment-${Date.now()}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invitation');
      }

      const data = await response.json();
      setInvitation(data);
      enqueueSnackbar('Invitation created successfully!', { variant: 'success' });
      
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to create invitation', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    enqueueSnackbar('Copied to clipboard!', { variant: 'success' });
  };

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
              Create Signup Invitation
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Generate a secure signup link for testing the Wix payment flow
            </Typography>
          </Box>

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  InputProps={{
                    startAdornment: <IconMail size={20} style={{ marginRight: 8 }} />
                  }}
                  placeholder="Enter email address"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Plan</InputLabel>
                  <Select
                    value={plan}
                    label="Plan"
                    onChange={(e) => setPlan(e.target.value)}
                  >
                    <MenuItem value="basic">Basic</MenuItem>
                    <MenuItem value="pro">Professional</MenuItem>
                    <MenuItem value="enterprise">Enterprise</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <IconSend size={20} />}
                sx={{ minWidth: 200 }}
              >
                {loading ? 'Creating Invitation...' : 'Create Invitation'}
              </Button>
            </Box>
          </Box>

          {/* Results */}
          {invitation && (
            <Paper sx={{ mt: 4, p: 3, bgcolor: 'success.50' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Invitation Created Successfully! ✅
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Email:</strong> {invitation.email}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Plan:</strong> {invitation.plan}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Token:</strong> {invitation.token}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      <strong>Signup URL:</strong>
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<IconCopy size={16} />}
                      onClick={() => copyToClipboard(invitation.signup_url)}
                    >
                      Copy
                    </Button>
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      wordBreak: 'break-all',
                      bgcolor: 'background.paper',
                      p: 1,
                      borderRadius: 1,
                      mt: 1
                    }}
                  >
                    {invitation.signup_url}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Expires:</strong> {new Date(invitation.expires_at).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => window.open(invitation.signup_url, '_blank')}
                  sx={{ mr: 2 }}
                >
                  Test Signup Link
                </Button>
                <Button
                  variant="text"
                  onClick={() => {
                    setInvitation(null);
                    setEmail('');
                  }}
                >
                  Create Another
                </Button>
              </Box>
            </Paper>
          )}

          {/* Instructions */}
          <Paper sx={{ mt: 4, p: 3, bgcolor: 'info.50' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              How to Test
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              1. Enter an email address and select a plan
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              2. Click "Create Invitation" to generate a signup link
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              3. Copy the signup URL and test the complete flow
            </Typography>
            <Typography variant="body2">
              4. The link will expire in 7 days and can only be used once
            </Typography>
          </Paper>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmailInvitation; 