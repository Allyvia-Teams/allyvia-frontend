/**
 * Subscription Plans Configuration
 *
 * This file defines the subscription plans and their associated module access.
 *
 * Hierarchy:
 * 1. Subscription Level → Determines which modules are available to the COMPANY
 * 2. Admin Level → Can grant/revoke access to modules for USERS (within subscription limits)
 * 3. User Level → Can only access modules granted by admin based on subscription limits
 */

import { type ModuleKey } from 'registry/builders';

export interface SubscriptionPlan {
  id: 'service' | 'goods' | 'pro';
  name: string;
  price: number;
  stripePriceId: string; // Stripe Price ID (price_*) - used directly for checkout sessions
  description: string;
  // Modules available in this subscription
  availableModules: ModuleKey[];
  // Complete feature list for display
  features: string[];
  // Key differentiators/best for indicators
  differentiators: string[];
}

/**
 * Service-Based Businesses Plan
 * Basic plan for service-oriented businesses
 */
export const SERVICE_PLAN: SubscriptionPlan = {
  id: 'service',
  name: 'Service-Based Businesses',
  price: 29.99,
  stripePriceId: 'price_1SA4sj5YmwoJ3MCRvV403JQR', // $29.99/month - Service-Based Businesses Plan
  description: 'Perfect for service-oriented businesses with basic integrations and calendar management',
  availableModules: [
    'dashboard',
    'integrations',
    'finance',
    'calendar',
    'documents',
    'crm',
    'employees',
    'employees-home',
    'employees-clock',
    'analytics',
    'settings'
  ],
  features: [
    'QuickBooks/Square/Clover integrations',
    'Calendar management',
    'Document storage',
    'CRM system',
    'Employee time clocking',
    'Analytics dashboard'
  ],
  differentiators: ['Basic integrations', 'Standard support']
};

/**
 * Goods-Based Businesses Plan
 * Includes all Service plan features + Inventory management
 */
export const GOODS_PLAN: SubscriptionPlan = {
  id: 'goods',
  name: 'Goods-Based Businesses',
  price: 39.99,
  stripePriceId: 'price_1SA4tT5YmwoJ3MCRinKRRjlU', // $39.99/month - Goods-Based Businesses Plan
  description: 'Everything in Service plan plus advanced inventory management and barcode scanning',
  availableModules: [
    // All Service modules
    'dashboard',
    'integrations',
    'finance',
    'calendar',
    'documents',
    'crm',
    'employees',
    'employees-home',
    'employees-clock',
    'analytics',
    'settings',
    // Additional modules for Goods
    'inventory',
    'inventory-home',
    'inventory-update'
  ],
  features: [
    'All Service-Based features',
    'Inventory management',
    'Full QuickBooks support',
    'Barcode scanning',
    'Stock tracking',
    'Purchase order management'
  ],
  differentiators: ['Advanced inventory tracking', 'Barcode scanning']
};

/**
 * Pro Plan
 * Includes all Goods plan features + Premium support
 */
export const PRO_PLAN: SubscriptionPlan = {
  id: 'pro',
  name: 'Pro Plan',
  price: 59.99,
  stripePriceId: 'price_1SA4uG5YmwoJ3MCRdVhegYOt', // $59.99/month - Pro Plan
  description: 'All features plus white-glove onboarding and dedicated support',
  availableModules: [
    // All Goods modules (same module access, but premium support)
    'dashboard',
    'integrations',
    'finance',
    'calendar',
    'documents',
    'crm',
    'employees',
    'employees-home',
    'employees-clock',
    'analytics',
    'settings',
    'insights',
    'inventory',
    'inventory-home',
    'inventory-update'
  ],
  features: [
    'All Goods-Based features',
    'AI integrations',
    '1-on-1 data migration support',
    '24/7 dedicated support line',
    'Personalized setup assistance',
    'Tailored business adjustments',
    'Priority feature requests'
  ],
  differentiators: ['White-glove onboarding', 'Dedicated success manager', 'AI-powered features']
};

/**
 * All available subscription plans
 */
export const SUBSCRIPTION_PLANS: Record<'service' | 'goods' | 'pro', SubscriptionPlan> = {
  service: SERVICE_PLAN,
  goods: GOODS_PLAN,
  pro: PRO_PLAN
};

/**
 * Get plan by ID
 */
export function getPlanById(planId: string): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS] || null;
}

/**
 * Get plan by Stripe Price ID
 */
export function getPlanByPriceId(priceId: string): SubscriptionPlan | null {
  return Object.values(SUBSCRIPTION_PLANS).find((plan) => plan.stripePriceId === priceId) || null;
}

/**
 * Helper function to remove plural suffixes for comparison
 * Removes 'es' first, then 's' to handle both "business" and "businesses"
 */
function removePluralSuffix(str: string): string {
  return str.replace(/es$/, '').replace(/s$/, '');
}

/**
 * Get plan by name (case-insensitive, handles "Plan" suffix and singular/plural differences)
 *
 * Examples:
 * - "Service-Based Business Plan" → matches "Service-Based Businesses"
 * - "Service-Based Businesses" → matches "Service-Based Businesses"
 * - "Pro Plan" → matches "Pro Plan"
 */
export function getPlanByName(name: string): SubscriptionPlan | null {
  if (!name) return null;

  // Normalize the input name: lowercase and remove "Plan" suffix if present
  const normalizedInput = name
    .toLowerCase()
    .replace(/\s+plan\s*$/, '') // Remove "Plan" suffix (e.g., "Service-Based Business Plan" → "service-based business")
    .trim();

  return (
    Object.values(SUBSCRIPTION_PLANS).find((plan) => {
      // Normalize plan name: lowercase and remove "Plan" suffix if present
      let normalizedPlanName = plan.name
        .toLowerCase()
        .replace(/\s+plan\s*$/, '') // Remove "Plan" suffix (e.g., "Pro Plan" → "pro")
        .trim();

      // Direct match (exact string match)
      if (normalizedPlanName === normalizedInput || plan.id === normalizedInput) {
        return true;
      }

      // Handle singular/plural variations (e.g., "business" vs "businesses")
      // Remove trailing 'es' first, then 's' for comparison
      // This handles: "businesses" → "business" → "busines", "business" → "busines"
      const inputBase = removePluralSuffix(normalizedInput);
      const planBase = removePluralSuffix(normalizedPlanName);

      // Compare base forms (handles both "Service-Based Business" and "Service-Based Businesses")
      if (inputBase === planBase && inputBase.length > 0) {
        return true;
      }

      // Word-by-word matching for cases like "Service-Based Business" vs "Service-Based Businesses"
      // Split into words and compare all but the last word exactly, then handle last word with plural/singular
      const inputWords = normalizedInput.split(/\s+/);
      const planWords = normalizedPlanName.split(/\s+/);

      if (inputWords.length === planWords.length && inputWords.length > 1) {
        // Compare all words except the last
        const inputPrefix = inputWords.slice(0, -1).join(' ');
        const planPrefix = planWords.slice(0, -1).join(' ');

        if (inputPrefix === planPrefix) {
          // Last words should match after removing plural/singular suffix
          const inputLast = removePluralSuffix(inputWords[inputWords.length - 1]);
          const planLast = removePluralSuffix(planWords[planWords.length - 1]);
          if (inputLast === planLast && inputLast.length > 0) {
            return true;
          }
        }
      }

      return false;
    }) || null
  );
}

/**
 * Check if a module is available in a subscription plan
 */
export function isModuleAvailable(planId: string, moduleKey: ModuleKey): boolean {
  const plan = getPlanById(planId);
  return plan ? plan.availableModules.includes(moduleKey) : false;
}

/**
 * Get all modules available in a plan
 */
export function getAvailableModules(planId: string): ModuleKey[] {
  const plan = getPlanById(planId);
  return plan ? plan.availableModules : [];
}

/**
 * Module display names mapping (derived from navigation route configs)
 */
export { MODULE_DISPLAY_NAMES, getModuleDisplayName } from 'registry/builders';
