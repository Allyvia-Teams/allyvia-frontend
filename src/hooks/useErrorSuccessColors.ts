import { useTheme } from '@mui/material';
import { OverridableStringUnion } from '@mui/types';

export function usePositiveOrNegativeColors(
  value: string | number,
  isWarning = false
): {
  isPositive: boolean;
  isZero: boolean;
  iconColor: OverridableStringUnion<'error' | 'success'>;
  textColor: string;
} {
  const theme = useTheme();
  const convert = typeof value == 'string' ? parseInt(value) : value;
  const isPositive = convert > 0;
  const isZero = convert == 0;

  const booleans = { isPositive, isZero };

  // If the card is configured to alert the user of a negative threshold being reached, use red instead
  if (isWarning) {
    return {
      iconColor: isPositive ? 'error' : 'success',
      textColor: isPositive ? (theme.palette.error.light as string) : 'inherit',
      ...booleans
    };
  }

  return {
    iconColor: isPositive ? 'success' : 'error',
    textColor: isPositive ? theme.palette.success.main : (theme.palette.error.main as string),
    ...booleans
  };
}
