import type { Product } from '../types/pos.types';

export interface ManualChargeForm {
  price: string;
  name: string;
  description: string;
  isTaxable: boolean;
}

export function manualChargePriceError(price: string): string | null {
  const raw = price.trim();
  if (!/^(?:\d+|\d*\.\d{1,2})$/.test(raw) || Number(raw) <= 0 || Number(raw) > 9999999999.99) {
    return 'Enter a price greater than $0 with no more than two decimal places.';
  }
  return null;
}

export function createManualCharge(form: ManualChargeForm, taxRate: number): Product {
  const error = manualChargePriceError(form.price);
  if (error) throw new Error(error);
  return {
    id: `manual:${crypto.randomUUID()}`,
    kind: 'manual',
    name: form.name.trim() || 'Manual charge',
    description: form.description.trim(),
    price: Number(form.price),
    isTaxable: form.isTaxable,
    taxRate: form.isTaxable ? taxRate : 0,
    sku: '',
    category: 'Manual charges',
    stock: 0
  };
}
