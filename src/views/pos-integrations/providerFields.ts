// Per-provider fields collected on step 0 of the connect wizard.
//
// Shopify is the first provider that needs anything beyond mode: its OAuth URL
// lives on the merchant's own domain, so there is nowhere to send them until
// they tell us which store is theirs. Keeping the fields in a map rather than
// an `if (provider === 'shopify')` means the next provider that needs a shop
// id or a region just adds a row.

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
