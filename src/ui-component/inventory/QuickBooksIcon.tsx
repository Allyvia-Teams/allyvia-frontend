import React from 'react';
import { Box } from '@mui/material';
import QuickBooksLogo from 'assets/images/icons/quickbooks_logo.png';

interface QuickBooksIconProps {
  size?: number;
}

const QuickBooksIcon: React.FC<QuickBooksIconProps> = ({ size = 24 }) => {
  return (
    <Box
      component="img"
      src={QuickBooksLogo}
      alt="QuickBooks"
      sx={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        objectFit: 'contain'
      }}
    />
  );
};

export default QuickBooksIcon;
