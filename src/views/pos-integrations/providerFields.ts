// Per-provider fields collected on step 0 of the connect wizard.
//
// Shopify is the first provider that needs anything beyond mode: its OAuth URL
// lives on the merchant's own domain, so there is nowhere to send them until
// they tell us which store is theirs. Keeping the fields in a map rather than
// an `if (provider === 'shopify')` means the next provider that needs a shop
// id or a region just adds a row.
//
// Clover needs none. Its authorize URL is fixed per region, and Clover echoes
// our signed `state` back, so the callback already knows which connection it
// is for; the merchant id arrives on the redirect (ALL-249).

export type ProviderFieldKey = 'shop_domain';

export interface ProviderField {
  key: ProviderFieldKey;
  label: string;
  helper: string;
  placeholder: string;
}

export const PROVIDER_FIELDS: Partial<Record<string, ProviderField[]>> = {
  shopify: [
    {
      key: 'shop_domain',
      label: 'Store domain',
      helper: 'Your store’s myshopify.com address. You can type just the name — mystore — or the full mystore.myshopify.com.',
      placeholder: 'mystore or mystore.myshopify.com'
    }
  ]
};

const SHOP_DOMAIN_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

/** Accept `mystore`, `mystore.myshopify.com`, or a pasted admin URL. */
export function normalizeShopDomain(input: string): string {
  let text = input.trim().toLowerCase();
  if (!text) return '';
  text = text.split('://').pop()!.split('/')[0].split('?')[0];
  if (text && !text.includes('.')) text = `${text}.myshopify.com`;
  return text;
}

export function isValidShopDomain(input: string): boolean {
  return SHOP_DOMAIN_RE.test(normalizeShopDomain(input));
}

/**
 * The shop_domain an existing connection must be moved to before authorize, or
 * null when nothing needs to change.
 *
 * The wizard reuses a provider's existing connection rather than creating a
 * second one, which is right for idempotent re-imports but wrong for the store
 * itself: a connection left over from an earlier attempt points at whatever
 * store was typed then, and the OAuth URL is built from that. Comparing the
 * typed domain against the stored one is what lets the merchant correct it
 * instead of being sent to a store they cannot open.
 */
export function pendingShopDomain(existing: string | null | undefined, typed: string): string | null {
  if (!typed || !isValidShopDomain(typed)) return null;
  const next = normalizeShopDomain(typed);
  return next === (existing ?? '') ? null : next;
}
