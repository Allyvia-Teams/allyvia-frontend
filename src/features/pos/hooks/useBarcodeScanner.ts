import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import posApi from '../api/posApi';
import type { Product } from '../types/pos.types';
import { scannerCommit, shouldIgnoreTarget } from './scannerHeuristics';

export function useBarcodeScanner(
  onProduct: (product: Product, retired: boolean) => void,
  notify: (message: string, variant: 'success' | 'warning' | 'error') => void
) {
  const location = useLocation();
  const events = useRef<Array<{ key: string; at: number }>>([]);
  const onProductRef = useRef(onProduct);
  onProductRef.current = onProduct;
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  useEffect(() => {
    const clear = () => {
      events.current = [];
    };
    const listener = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const dedicated = target?.getAttribute('data-barcode-scan-field') === 'true';
      if (!dedicated && shouldIgnoreTarget(target)) return;
      const now = performance.now();
      if (event.key !== 'Enter' && event.key.length !== 1) return;
      if (events.current.length && now - events.current[events.current.length - 1].at > 35) events.current = [];
      events.current.push({ key: event.key, at: now });
      if (event.key !== 'Enter') return;
      const code = scannerCommit(events.current);
      events.current = [];
      if (!code) return;
      event.preventDefault();
      try {
        const hit = await posApi.lookupBarcode(code);
        if (!hit) {
          notifyRef.current(`Unknown barcode: ${code}`, 'error');
          return;
        }
        onProductRef.current(hit.product, hit.retired);
        notifyRef.current(
          hit.retired ? `Retired barcode: ${code}. Label is out of date.` : 'Item added to cart',
          hit.retired ? 'warning' : 'success'
        );
      } catch {
        notifyRef.current('Barcode lookup failed', 'error');
      }
    };
    window.addEventListener('keydown', listener);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', listener);
      window.removeEventListener('blur', clear);
      clear();
    };
  }, [location.pathname]);
}
