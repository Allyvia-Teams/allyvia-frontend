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

const BASE_PLAN_ALL_FEATURES: PlanFeature[] = [
  { name: 'QuickBooks/Square/Clover integrations', icon: 'integrations' },
  { name: 'Calendar management', icon: 'calendar' },
  { name: 'Document storage', icon: 'storage' },
  { name: 'CRM system', icon: 'support' },
  { name: 'Employee time clocking', icon: 'time' },
  { name: 'Analytics dashboard', icon: 'analytics' },
  { name: 'Inventory management', icon: 'storage' },
  { name: 'Barcode scanning', icon: 'scanner' },
  { name: 'Stock tracking', icon: 'analytics' },
  { name: 'Purchase order management', icon: 'orders' }
];

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
    name: 'Base Plan',
    description: 'All core platform features for operations and accounting management.',
    price: 29.99,
    keyFeatures: [
      { name: 'QuickBooks/Square/Clover integrations', icon: 'integrations' },
      { name: 'CRM, calendar, and document storage', icon: 'support' },
      { name: 'Inventory, barcode scanning, and stock tracking', icon: 'scanner' }
    ],
    allFeatures: BASE_PLAN_ALL_FEATURES,
    differentiators: ['Small to mid-size businesses looking for an all-in-one operations and accounting management platform'],
    limits: { users: 5, locations: 3, invoices: 50 }
  },
  goods: {
    name: 'Base Plan',
    description: 'All core platform features for operations and accounting management.',
    price: 39.99,
    keyFeatures: [
      { name: 'QuickBooks/Square/Clover integrations', icon: 'integrations' },
      { name: 'CRM, calendar, and document storage', icon: 'support' },
      { name: 'Inventory, barcode scanning, and stock tracking', icon: 'scanner' }
    ],
    allFeatures: BASE_PLAN_ALL_FEATURES,
    differentiators: ['Small to mid-size businesses looking for an all-in-one operations and accounting management platform'],
    limits: { users: 15, locations: 5, invoices: 200 }
  },
  pro: {
    name: 'Pro Plan',
    description: 'Everything in Base Plan, plus hands-on support and advanced insights.',
    price: 59.99,
    keyFeatures: [
      { name: 'Everything in Base Plan', icon: 'integrations' },
      { name: 'Access to Insights tab (ML-driven business insights and analytics)', icon: 'insights' },
      { name: '1-on-1 data migration support', icon: 'support' },
      { name: 'Personalized setup and onboarding', icon: 'support' }
    ],
    allFeatures: [
      ...BASE_PLAN_ALL_FEATURES,
      { name: 'Access to Insights tab (ML-driven business insights and analytics)', icon: 'insights' },
      { name: '1-on-1 data migration support', icon: 'support' },
      { name: 'Personalized setup and onboarding', icon: 'support' },
      { name: 'Monthly meetings for feedback and improvement', icon: 'calendar' },
      { name: 'Dedicated success consultant assigned to the account', icon: 'support' }
    ],
    differentiators: ['Businesses wanting hands-on support, advanced analytics, and a dedicated point of contact'],
    limits: { users: 50, locations: 10, invoices: 500 }
  }
};

/** Stripe product IDs per plan key (used by signup and settings). Single source of truth. */
export const PLAN_STRIPE_PRODUCT_IDS: Record<'service' | 'goods' | 'pro', string> = {
  // Allyvia LLC live account (acct_1U36kl50Zuhn38Bv).
  // "service" and "goods" both map to the Base Plan product.
  service: 'prod_V3c65JvfowHVNh',
  goods: 'prod_V3c65JvfowHVNh',
  pro: 'prod_V3cDS1y0gVy9cX'
};

function stripePriceFromEnv(envKey: string, fallback: string): string {
  const raw = import.meta.env[envKey as keyof ImportMetaEnv] as string | undefined;
  if (raw === undefined || raw === null) return fallback;
  const trimmed = String(raw).trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Stripe Price IDs for checkout (signup) and change-plan. Keys align with PaymentPlanSelection (`base` = Base Plan, `pro`).
 * Set VITE_STRIPE_PRICE_* at build time to override; empty env values fall back to defaults so the field is never omitted.
 */
export const STRIPE_PRICE_IDS = {
  base: {
    monthly: stripePriceFromEnv('VITE_STRIPE_PRICE_BASE_MONTHLY', 'price_1U3UsD50Zuhn38BvSV5ZqwOb'),
    annual: stripePriceFromEnv('VITE_STRIPE_PRICE_BASE_ANNUAL', 'price_1U3V0I50Zuhn38BvgaRQ59Ov')
  },
  pro: {
    monthly: stripePriceFromEnv('VITE_STRIPE_PRICE_PRO_MONTHLY', 'price_1U3Uyv50Zuhn38BvlvqE9Nkf'),
    annual: stripePriceFromEnv('VITE_STRIPE_PRICE_PRO_ANNUAL', 'price_1U3Uz050Zuhn38Bv29vR9zKL')
  }
} as const;

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
  'Service-Based Businesses': 'service',
  'Base Plan': 'service',
  Base: 'service',
  Goods: 'goods',
  'Goods-Based': 'goods',
  'Goods-Based Businesses': 'goods',
  Pro: 'pro',
  'Pro Plan': 'pro'
};

export function getPlanDetails(planName: string): PlanDetails {
  const key = BILLING_PLAN_TO_KEY[planName] ?? 'free';
  return PLAN_DETAILS[key];
}
