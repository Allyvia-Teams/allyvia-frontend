import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Container, Typography, Stack, Paper } from '@mui/material';
import { HomeOutlined, RefreshOutlined, BugReportOutlined } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              textAlign: 'center',
              py: 4
            }}
          >
            {/* Error Icon */}
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                backgroundColor: 'error.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 4
              }}
            >
              <BugReportOutlined
                sx={{
                  fontSize: 60,
                  color: 'error.main'
                }}
              />
            </Box>

            {/* Error Content */}
            <Box sx={{ mb: 4, maxWidth: 600 }}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                  fontWeight: 600,
                  color: 'text.primary',
                  mb: 2
                }}
              >
                Something went wrong
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  fontSize: { xs: '1rem', sm: '1.125rem' },
                  color: 'text.secondary',
                  mb: 4,
                  lineHeight: 1.6
                }}
              >
                We're sorry, but something unexpected happened. Our team has been notified and is working to fix this issue.
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%', maxWidth: 400, mb: 4 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<RefreshOutlined />}
                onClick={this.handleReload}
                sx={{
                  flex: 1,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600
                }}
              >
                Reload Page
              </Button>

              <Button
                variant="outlined"
                size="large"
                startIcon={<HomeOutlined />}
                onClick={this.handleGoHome}
                sx={{
                  flex: 1,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600
                }}
              >
                Go to Home
              </Button>
            </Stack>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Paper
                elevation={1}
                sx={{
                  p: 3,
                  mt: 4,
                  width: '100%',
                  maxWidth: 800,
                  textAlign: 'left',
                  backgroundColor: 'grey.50'
                }}
              >
                <Typography variant="h6" color="error" gutterBottom>
                  Error Details (Development)
                </Typography>

                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    backgroundColor: 'grey.100',
                    p: 2,
                    borderRadius: 1,
                    overflow: 'auto',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Paper>
            )}
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
