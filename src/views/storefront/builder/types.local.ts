/**
 * TEMPORARY - replace with T1's types/storefront.ts once merged.
 * Shapes mirror the frozen ALL-192 epic contract.
 */

export type StorefrontPageKind = 'home' | 'standard' | 'policy';

export type StorefrontFieldType =
  | 'text'
  | 'richtext'
  | 'media'
  | 'media_list'
  | 'link'
  | 'color'
  | 'select'
  | 'toggle'
  | 'number'
  | 'product_ref'
  | 'collection_ref';

export type StorefrontFieldDescriptor = {
  key: string;
  label: string;
  type: StorefrontFieldType;
  required?: boolean;
  help_text?: string;
  options?: Array<{ value: string; label: string }>;
  default?: unknown;
  /** Optional max length for text fields (validation only — never truncate). */
  max_length?: number;
  /** Optional bounds for number fields. */
  min?: number;
  max?: number;
};

export type StorefrontSectionType = {
  type: string;
  label: string;
  description?: string;
  fields: StorefrontFieldDescriptor[];
};

export type StorefrontSectionInstance = {
  id: string;
  type: string;
  label: string;
  is_visible: boolean;
  sort: number;
  settings: Record<string, unknown>;
};

export type StorefrontPage = {
  id: string;
  site: string;
  kind: StorefrontPageKind;
  handle: string;
  title: string;
  seo_title: string;
  seo_description: string;
  sections: StorefrontSectionInstance[];
  is_visible: boolean;
  sort: number;
};

export type StorefrontLinkKind = 'home' | 'collection' | 'product' | 'page' | 'external';

export type StorefrontLinkValue = {
  kind: StorefrontLinkKind;
  /** Target id/handle for collection/product/page, or external URL. */
  value?: string;
};

export type StorefrontMediaValue = {
  id?: string;
  url?: string;
  alt?: string;
} | null;

export type StorefrontThemePalette = {
  ink: string;
  paper: string;
  surface: string;
  accent: string;
  line: string;
  muted: string;
};

export type StorefrontProductRef = {
  id: string;
  title: string;
};

export type StorefrontCollectionRef = {
  id: string;
  title: string;
};
