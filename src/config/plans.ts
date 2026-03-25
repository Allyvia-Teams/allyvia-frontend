/**
 * Plan details aligned with the signup flow (PaymentPlanSelection).
 * Single source of truth for plan details across signup and settings.
 */

export type PlanKey = 'free' | 'service' | 'goods' | 'pro';

export interface PlanFeature {
  name: string;
  icon: string;
  /** Optional limit label, e.g. "Up to 5 users" */
  limit?: string;
}

export interface PlanLimits {
  users?: number;
  locations?: number;
  invoices?: number;
  /** Custom limit labels for "What's included" */
  [key: string]: number | string | undefined;
}

export interface PlanDetails {
  name: string;
  description: string;
  price: number;
  keyFeatures: PlanFeature[];
  allFeatures: PlanFeature[];
  differentiators: string[];
  /** Optional limits for display (e.g. users, locations, invoices) */
  limits?: PlanLimits;
}

export const PLAN_DETAILS: Record<PlanKey, PlanDetails> = {
  free: {
    name: 'Free',
    description: 'Basic access to Allyvia. Upgrade to unlock integrations, calendar, documents, CRM, and more.',
    price: 0,
    keyFeatures: [
      { name: 'Basic dashboard access', icon: 'analytics' },
      { name: 'Limited features', icon: 'support' }
    ],
    allFeatures: [
      { name: 'Basic dashboard access', icon: 'analytics' },
      { name: 'Limited features', icon: 'support' }
    ],
    differentiators: ['Upgrade for full features'],
  limits: { users: 1, locations: 1, invoices: 5 }
  },
  service: {
    name: 'Service-Based Businesses',
    description: 'Everything you need to run a service business: integrations, calendar, documents, CRM, and time tracking.',
    price: 29.99,
    keyFeatures: [
      { name: 'QuickBooks/Square/Clover integrations', icon: 'integrations' },
      { name: 'Calendar management', icon: 'calendar' },
      { name: 'Document storage', icon: 'storage' }
    ],
    allFeatures: [
      { name: 'QuickBooks/Square/Clover integrations', icon: 'integrations' },
      { name: 'Calendar management', icon: 'calendar' },
      { name: 'Document storage', icon: 'storage' },
      { name: 'CRM system', icon: 'support' },
      { name: 'Employee time clocking', icon: 'time' },
      { name: 'Analytics dashboard', icon: 'analytics' }
    ],
    differentiators: ['Basic integrations', 'Standard support'],
  limits: { users: 5, locations: 3, invoices: 50 }
  },
  goods: {
    name: 'Goods-Based Businesses',
    description: 'All Service-Based features plus inventory, barcode scanning, and purchase orders.',
    price: 39.99,
    keyFeatures: [
      { name: 'All Service-Based features', icon: 'integrations' },
      { name: 'Inventory management', icon: 'storage' },
      { name: 'Barcode scanning', icon: 'scanner' }
    ],
    allFeatures: [
      { name: 'All Service-Based features', icon: 'integrations' },
      { name: 'Inventory management', icon: 'storage' },
      { name: 'Full QuickBooks support', icon: 'integrations' },
      { name: 'Barcode scanning', icon: 'scanner' },
      { name: 'Stock tracking', icon: 'analytics' },
      { name: 'Purchase order management', icon: 'orders' }
    ],
    differentiators: ['Advanced inventory tracking', 'Barcode scanning'],
  limits: { users: 15, locations: 5, invoices: 200 }
  },
  pro: {
    name: 'Pro Plan',
    description: 'White-glove onboarding with 1-on-1 migration support, 24/7 dedicated support, and priority feature requests.',
    price: 59.99,
    keyFeatures: [
      { name: 'All Goods-Based features', icon: 'integrations' },
      { name: '1-on-1 data migration support', icon: 'support' },
      { name: '24/7 dedicated support line', icon: 'support' }
    ],
    allFeatures: [
      { name: 'All Goods-Based features', icon: 'integrations' },
      { name: '1-on-1 data migration support', icon: 'support' },
      { name: '24/7 dedicated support line', icon: 'support' },
      { name: 'Personalized setup assistance', icon: 'support' },
      { name: 'Tailored business adjustments', icon: 'support' },
      { name: 'Priority feature requests', icon: 'support' }
    ],
    differentiators: ['White-glove onboarding', 'Dedicated success manager'],
  limits: { users: 50, locations: 10, invoices: 500 }
  }
};

/** Stripe product IDs per plan key (used by signup and settings). Single source of truth. */
export const PLAN_STRIPE_PRODUCT_IDS: Record<Exclude<PlanKey, 'free'>, string> = {
  service: 'prod_T6HRZcS28hiLQO',
  goods: 'prod_T6HSeK49wpdpLd',
  pro: 'prod_T6HTdnkGDQsDxv'
};

/** Plan order for upgrade/downgrade: free < service < goods < pro */
export const PLAN_ORDER: PlanKey[] = ['free', 'service', 'goods', 'pro'];

export function getPlanOrderIndex(key: PlanKey): number {
  const i = PLAN_ORDER.indexOf(key);
  return i === -1 ? 0 : i;
}

/** Plans that are above the given plan (for upgrade list). Returns paid plans only. */
export function getPlansAbove(currentPlanKey: PlanKey): PlanKey[] {
  const current = getPlanOrderIndex(currentPlanKey);
  return (PLAN_ORDER.filter((_, i) => i > current) as PlanKey[]).filter((k) => k !== 'free');
}

/** Plans that are below the given plan (for downgrade list), excluding free. */
export function getPlansBelow(currentPlanKey: PlanKey): PlanKey[] {
  const current = getPlanOrderIndex(currentPlanKey);
  return PLAN_ORDER.filter((_, i) => i > 0 && i < current) as PlanKey[];
}

/** Map billing UI tier names to plan config keys */
export const BILLING_PLAN_TO_KEY: Record<string, PlanKey> = {
  Free: 'free',
  Starter: 'service',
  'Service-Based': 'service',
  Goods: 'goods',
  'Goods-Based': 'goods',
  Pro: 'pro'
};

export function getPlanDetails(planName: string): PlanDetails {
  const key = BILLING_PLAN_TO_KEY[planName] ?? 'free';
  return PLAN_DETAILS[key];
}
