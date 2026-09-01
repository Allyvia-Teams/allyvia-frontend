import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axiosServices from 'utils/axios';
import type { Product } from '../types/pos.types';
import { scannerCommit, shouldIgnoreTarget } from './scannerHeuristics';

export function useBarcodeScanner(onProduct: (product: Product, retired: boolean) => void, notify: (message: string, variant: 'success' | 'warning' | 'error') => void) {
  const location = useLocation();
  const events = useRef<Array<{ key: string; at: number }>>([]);
  const onProductRef = useRef(onProduct); onProductRef.current = onProduct;
  const notifyRef = useRef(notify); notifyRef.current = notify;
  useEffect(() => {
    const clear = () => { events.current = []; };
    const listener = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const dedicated = target?.getAttribute('data-barcode-scan-field') === 'true';
      if (!dedicated && shouldIgnoreTarget(target)) return;
      const now = performance.now();
      if (event.key !== 'Enter' && event.key.length !== 1) return;
      if (events.current.length && now - events.current[events.current.length - 1].at > 35) events.current = [];
      events.current.push({ key: event.key, at: now });
      if (event.key !== 'Enter') return;
      const code = scannerCommit(events.current); events.current = [];
      if (!code) return;
      event.preventDefault();
      try {
        const response = await axiosServices.get('/api/items/lookup', { params: { code } });
        const item = response.data.item || response.data;
        onProductRef.current(item.product || item, Boolean(response.data.retired));
        notifyRef.current(response.data.retired ? `Retired barcode: ${code}. Label is out of date.` : 'Item added to cart', response.data.retired ? 'warning' : 'success');
      } catch (error: any) {
        if (error?.response?.status === 404) notifyRef.current(`Unknown barcode: ${code}`, 'error');
        else notifyRef.current('Barcode lookup failed', 'error');
      }
    };
    window.addEventListener('keydown', listener); window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', listener); window.removeEventListener('blur', clear); clear(); };
  }, [location.pathname]);
}
