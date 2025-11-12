// Theme-aware Bento Grid Color Hook
import { useTheme, alpha } from '@mui/material/styles';

export type BentoColorScheme =
  | 'payments'
  | 'invoices'
  | 'bills'
  | 'customers'
  | 'vendors'
  | 'accounts'
  | 'items'
  | 'billpayments'
  | 'vendorcredits'
  | 'purchases';

export interface BentoColor {
  gradient: string;
  solidColor: string;
  lightColor: string;
  darkColor: string;
  textColor: string;
  iconColor: string;
  hoverGradient: string;
  glowColor?: string;
}

export const useBentoColors = () => {
  const theme = useTheme();

  const colors: Record<BentoColorScheme, BentoColor> = {
    payments: {
      gradient: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
      solidColor: theme.palette.primary.main,
      lightColor: theme.palette.primary.light,
      darkColor: theme.palette.primary.dark,
      textColor: '#ffffff',
      iconColor: '#ffffff',
      hoverGradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
      glowColor: alpha(theme.palette.primary.main, 0.3)
    },
    invoices: {
      gradient: '#ffffff',
      solidColor: '#ffffff',
      lightColor: theme.palette.primary.light,
      darkColor: theme.palette.primary.dark,
      textColor: theme.palette.primary.dark,
      iconColor: theme.palette.primary.main,
      hoverGradient: `linear-gradient(135deg, #ffffff 0%, ${theme.palette.primary.light} 100%)`,
      glowColor: alpha(theme.palette.primary.main, 0.2)
    },
    bills: {
      gradient: `linear-gradient(135deg, ${theme.palette.primary[800]} 0%, ${theme.palette.primary.dark} 100%)`,
      solidColor: theme.palette.primary[800],
      lightColor: theme.palette.primary.main,
      darkColor: theme.palette.primary[800],
      textColor: '#ffffff',
      iconColor: '#ffffff',
      hoverGradient: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
      glowColor: alpha(theme.palette.primary[800], 0.3)
    },
    customers: {
      gradient: `linear-gradient(135deg, ${theme.palette.primary[200]} 0%, ${theme.palette.primary.light} 100%)`,
      solidColor: theme.palette.primary[200],
      lightColor: theme.palette.primary.light,
      darkColor: theme.palette.primary[200],
      textColor: theme.palette.primary.dark,
      iconColor: theme.palette.primary.main,
      hoverGradient: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${alpha(theme.palette.primary[200], 0.8)} 100%)`
    },
    vendors: {
      gradient: `linear-gradient(135deg, ${theme.palette.primary[200]} 0%, ${theme.palette.primary.light} 100%)`,
      solidColor: theme.palette.primary[200],
      lightColor: theme.palette.primary.light,
      darkColor: theme.palette.primary[200],
      textColor: theme.palette.primary.dark,
      iconColor: theme.palette.primary.main,
      hoverGradient: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${alpha(theme.palette.primary[200], 0.8)} 100%)`
    },
    accounts: {
      gradient: '#ffffff',
      solidColor: '#ffffff',
      lightColor: theme.palette.primary.light,
      darkColor: theme.palette.primary.dark,
      textColor: theme.palette.primary.dark,
      iconColor: theme.palette.primary.main,
      hoverGradient: `linear-gradient(135deg, #ffffff 0%, ${theme.palette.primary.light} 100%)`
    },
    items: {
      gradient: '#ffffff',
      solidColor: '#ffffff',
      lightColor: theme.palette.primary.light,
      darkColor: theme.palette.primary.dark,
      textColor: theme.palette.primary.dark,
      iconColor: theme.palette.primary.main,
      hoverGradient: `linear-gradient(135deg, #ffffff 0%, ${theme.palette.primary.light} 100%)`
    },
    billpayments: {
      gradient: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
      solidColor: theme.palette.primary.main,
      lightColor: theme.palette.primary.light,
      darkColor: theme.palette.primary.dark,
      textColor: '#ffffff',
      iconColor: '#ffffff',
      hoverGradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`
    },
    vendorcredits: {
      gradient: '#ffffff',
      solidColor: '#ffffff',
      lightColor: theme.palette.primary.light,
      darkColor: theme.palette.primary.dark,
      textColor: theme.palette.primary.dark,
      iconColor: theme.palette.primary.main,
      hoverGradient: `linear-gradient(135deg, #ffffff 0%, ${theme.palette.primary.light} 100%)`
    },
    purchases: {
      gradient: `linear-gradient(135deg, ${theme.palette.primary[800]} 0%, ${theme.palette.primary.dark} 100%)`,
      solidColor: theme.palette.primary[800],
      lightColor: theme.palette.primary.main,
      darkColor: theme.palette.primary[800],
      textColor: '#ffffff',
      iconColor: '#ffffff',
      hoverGradient: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
    }
  };

  return colors;
};

// Helper function to get color with opacity
export const getBentoColorWithOpacity = (theme: any, scheme: BentoColorScheme, opacity: number) => {
  const colors = {
    payments: theme.palette.primary.main,
    invoices: theme.palette.primary.dark,
    bills: theme.palette.primary[800],
    customers: theme.palette.primary[200],
    vendors: theme.palette.primary[200],
    accounts: theme.palette.primary.dark,
    items: theme.palette.primary.dark,
    billpayments: theme.palette.primary.main,
    vendorcredits: theme.palette.primary.dark,
    purchases: theme.palette.primary[800]
  };

  return alpha(colors[scheme], opacity);
};

// Container background configurations using theme
export const useBentoContainerStyles = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return {
    background: isDark
      ? `linear-gradient(145deg, ${theme.palette.grey[900]} 0%, ${theme.palette.background.paper} 100%)`
      : `linear-gradient(145deg, ${theme.palette.grey[50]} 0%, ${theme.palette.background.paper} 100%)`,
    borderColor: alpha(theme.palette.divider, 0.8),
    gap: 10, // px
    padding: 12, // px
    borderRadius: 20, // px
    boxShadow: theme.shadows[isDark ? 4 : 3]
  };
};
