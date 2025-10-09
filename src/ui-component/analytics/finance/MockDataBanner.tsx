import React from 'react';
import { Alert } from '@mui/material';

const MockDataBanner: React.FC = () => {
  return (
    <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
      Finance analytics is using mock data.
    </Alert>
  );
};

export default MockDataBanner;
