/** ALL-192 shared merchant contract. Section schemas are fetched from the API. */
export type StorefrontId = string;
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
export interface StorefrontTheme {
  colors?: Partial<Record<'ink' | 'paper' | 'surface' | 'accent' | 'line' | 'muted', string>>;
  fonts?: { heading: string; body: string };
  radius?: number;
  logo_media_id?: StorefrontId | null;
}
export interface StorefrontSettings {
  socials?: Record<string, string>;
  contact?: { email?: string; phone?: string; address?: string };
  stock_buffer?: number;
  online_fulfilment_locations?: StorefrontId[];
  shipping?: JsonObject;
  pickup?: JsonObject;
  seo?: { title?: string; description?: string };
}
export type SiteStatus = 'draft' | 'coming_soon' | 'live';
export interface StorefrontSite {
  id: StorefrontId;
  company: StorefrontId;
  status: SiteStatus;
  subdomain: string;
  theme: StorefrontTheme;
  settings: StorefrontSettings;
  draft_revision: number;
  published_at: string | null;
}
export interface StorefrontSection {
  id: string;
  type: string;
  fields: JsonObject;
}
export interface SectionField {
  key: string;
  type: 'text' | 'richtext' | 'media' | 'media_list' | 'link' | 'color' | 'select' | 'toggle' | 'number' | 'product_ref' | 'collection_ref';
  label: string;
  required?: boolean;
  max_length?: number;
  max_items?: number;
  min?: number;
  max?: number;
  options?: string[];
  default?: JsonValue;
}
export interface SectionType {
  label: string;
  icon: string;
  max_per_page: number | null;
  fields: SectionField[];
}
export type SectionRegistry = Record<string, SectionType>;
export interface StorefrontPage {
  id: StorefrontId;
  site: StorefrontId;
  kind: 'home' | 'standard' | 'policy';
  handle: string;
  title: string;
  seo_title: string;
  seo_description: string;
  sections: StorefrontSection[];
  is_visible: boolean;
  sort: number;
}
export interface StorefrontSnapshot {
  theme: StorefrontTheme;
  settings: StorefrontSettings;
  pages: StorefrontPage[];
  products: StorefrontProduct[];
  collections: StorefrontCollection[];
}
export interface StorefrontVersion {
  id: StorefrontId;
  site: StorefrontId;
  number: number;
  snapshot: StorefrontSnapshot;
  published_by: StorefrontId | null;
  created_at: string;
}
export interface StorefrontDomain {
  id: StorefrontId;
  site: StorefrontId;
  host: string;
  kind: 'subdomain' | 'custom';
  status: 'pending_dns' | 'verifying' | 'active' | 'error' | 'removed';
  verification_token: string;
  dns_target: string;
  cert_state: string;
  is_primary: boolean;
  last_checked_at: string | null;
  last_error: string;
}
export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT';
  name: string;
  value: string;
}
export interface DomainInstructions {
  domain: StorefrontDomain;
  records: DnsRecord[];
}
export interface StorefrontProduct {
  id: StorefrontId;
  site: StorefrontId;
  product: StorefrontId;
  is_published: boolean;
  handle: string;
  seo_title: string;
  seo_description: string;
  sort: number;
}
export interface StorefrontCollectionItem {
  id: StorefrontId;
  collection: StorefrontId;
  product: StorefrontId;
  sort: number;
}
export interface StorefrontCollection {
  id: StorefrontId;
  site: StorefrontId;
  handle: string;
  title: string;
  rule: { type: 'manual' } | { type: 'category'; value: string };
  sort: number;
  items: StorefrontCollectionItem[];
}
export interface MediaAsset {
  id: StorefrontId;
  company: StorefrontId;
  file: string;
  kind: string;
  alt: string;
  width: number | null;
  height: number | null;
  checksum: string;
  created_by: StorefrontId | null;
}
export interface ProductImage {
  id: StorefrontId;
  product: StorefrontId;
  media: StorefrontId;
  sort: number;
  is_primary: boolean;
}
export interface StorefrontOrder {
  id: StorefrontId;
  site: StorefrontId;
  ref: string;
  email: string;
  phone: string;
  shipping_address: JsonObject;
  fulfilment_method: 'ship' | 'pickup';
  fulfilment_status: 'new' | 'packed' | 'shipped' | 'picked_up' | 'cancelled';
  stripe_session_id: string;
  stripe_payment_intent_id: string;
  sale: StorefrontId | null;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  stock_sync_status: string;
  totals: JsonObject;
  cart_id: StorefrontId | null;
}
export interface StorefrontChecklistItem {
  complete: boolean;
  count: number;
}
export type StorefrontChecklist = Record<
  | 'homepage_sections'
  | 'published_products'
  | 'product_images'
  | 'payments_connected'
  | 'domain_active'
  | 'policies_written'
  | 'shipping_configured',
  StorefrontChecklistItem
>;
export interface StorefrontDraft {
  site: StorefrontSite;
  pages: StorefrontPage[];
}
export interface DraftConflict {
  detail: string;
  current: StorefrontDraft;
}
export type UpdateSitePayload = Partial<Pick<StorefrontSite, 'theme' | 'settings' | 'subdomain' | 'status'>> & { draft_revision: number };
export type CreatePagePayload = Pick<StorefrontPage, 'kind' | 'handle' | 'title'> &
  Partial<Pick<StorefrontPage, 'seo_title' | 'seo_description' | 'is_visible' | 'sort'>>;
export type UpdatePagePayload = Partial<CreatePagePayload>;
export interface UpdateSectionsPayload {
  sections: StorefrontSection[];
  draft_revision: number;
}
export type UpdateProductPayload = Partial<Pick<StorefrontProduct, 'is_published' | 'handle' | 'seo_title' | 'seo_description' | 'sort'>>;
export type CreateCollectionPayload = Pick<StorefrontCollection, 'title' | 'handle' | 'rule'> & {
  sort?: number;
  product_ids?: StorefrontId[];
};
