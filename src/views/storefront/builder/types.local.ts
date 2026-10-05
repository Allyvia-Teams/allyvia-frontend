/**
 * Local-only storefront builder shapes.
 * Page/section/field contracts come from T1 (`types/storefront`).
 */

export type {
  SectionField,
  SectionType,
  SectionRegistry,
  StorefrontPage,
  StorefrontSection,
  JsonObject,
  JsonValue
} from 'types/storefront';

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
