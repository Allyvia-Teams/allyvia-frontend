import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

interface ChartErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ChartErrorBoundary extends React.Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
            <Alert severity="warning">
              <Typography variant="body2">Chart failed to render. Please refresh the page or try again.</Typography>
            </Alert>
          </Box>
        )
      );
    }

    return this.props.children;
  }
}

export default ChartErrorBoundary;
