import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface BentoGridLayoutProps {
  children: React.ReactNode;
}

const BentoGridLayout: React.FC<BentoGridLayoutProps> = ({ children }) => {
  const theme = useTheme();

  return (
    <Box
      className="bento-grid"
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gridTemplateRows: 'repeat(6, minmax(80px, auto))',
        gap: 'inherit', // Inherit gap from BentoContainer
        gridTemplateAreas: `
          "payments payments payments payments payments payments payments payments invoices invoices invoices invoices"
          "payments payments payments payments payments payments payments payments invoices invoices invoices invoices"
          "payments payments payments payments payments payments payments payments invoices invoices invoices invoices"
          "customers customers customers accounts accounts accounts accounts accounts bills bills bills bills"
          "vendorcredits vendorcredits vendorcredits billpayments billpayments billpayments billpayments billpayments vendors vendors items items"
          "vendorcredits vendorcredits vendorcredits billpayments billpayments billpayments billpayments billpayments purchases purchases purchases purchases"
        `,
        // Responsive adjustments
        [theme.breakpoints.down('lg')]: {
          gridTemplateColumns: 'repeat(8, 1fr)',
          gridTemplateRows: 'repeat(auto-fit, minmax(80px, auto))',
          gridTemplateAreas: `
            "payments payments payments payments invoices invoices invoices invoices"
            "payments payments payments payments invoices invoices invoices invoices"
            "bills bills bills bills customers customers customers customers"
            "accounts accounts accounts accounts vendors vendors items items"
            "billpayments billpayments billpayments billpayments vendorcredits vendorcredits vendorcredits vendorcredits"
            "purchases purchases purchases purchases purchases purchases purchases purchases"
          `
        },
        [theme.breakpoints.down('md')]: {
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'auto',
          gridTemplateAreas: `
            "payments payments payments payments"
            "invoices invoices invoices invoices"
            "bills bills customers customers"
            "accounts accounts vendors vendors"
            "items items billpayments billpayments"
            "vendorcredits vendorcredits purchases purchases"
          `
        },
        [theme.breakpoints.down('sm')]: {
          gridTemplateColumns: '1fr',
          gridTemplateRows: 'auto',
          gridTemplateAreas: `
            "payments"
            "invoices"
            "bills"
            "customers"
            "accounts"
            "vendors"
            "items"
            "billpayments"
            "vendorcredits"
            "purchases"
          `
        }
      }}
    >
      {children}
    </Box>
  );
};

// Export grid area names for use in tile components
export const gridAreas = {
  payments: 'payments',
  invoices: 'invoices',
  bills: 'bills',
  customers: 'customers',
  vendors: 'vendors',
  accounts: 'accounts',
  items: 'items',
  billpayments: 'billpayments',
  vendorcredits: 'vendorcredits',
  purchases: 'purchases'
};

export default BentoGridLayout;
