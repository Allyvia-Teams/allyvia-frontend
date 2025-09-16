import { useMemo } from 'react';
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

export interface BreakpointState {
  lte320: boolean; // <= 320px
  lte375: boolean; // <= 375px (sm)
  lte768: boolean; // <= 768px (md)
  lte1024: boolean; // <= 1024px (lg)
  gte375: boolean; // >= 375px (sm)
  gte768: boolean; // >= 768px (md)
  gte1024: boolean; // >= 1024px (lg)
  isMobile: boolean; // <= 375
  isTablet: boolean; // 376 - 1024
  isDesktop: boolean; // >= 1024
}

export default function useBreakpoint(): BreakpointState {
  const lte320 = useMediaQuery('(max-width:320px)');
  const lte375 = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const lte768 = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const lte1024 = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'));
  const gte375 = useMediaQuery((theme: Theme) => theme.breakpoints.up('sm'));
  const gte768 = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
  const gte1024 = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));

  const isMobile = lte375;
  const isTablet = !isMobile && lte1024;
  const isDesktop = gte1024;

  return useMemo(
    () => ({ lte320, lte375, lte768, lte1024, gte375, gte768, gte1024, isMobile, isTablet, isDesktop }),
    [lte320, lte375, lte768, lte1024, gte375, gte768, gte1024, isMobile, isTablet, isDesktop]
  );
}
