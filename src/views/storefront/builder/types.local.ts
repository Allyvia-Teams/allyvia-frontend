/**
 * Local-only storefront builder shapes.
 * Field/registry/page contracts come from T1 (`types/storefront`).
 * Section visibility / label / settings→fields stay here until Siddhant confirms.
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

/**
 * TEMP UI section row for SectionList / inspector.
 * T1 `StorefrontSection` is `{ id, type, fields }` only — map `settings` ↔ `fields`
 * when talking to the API; keep label / is_visible / sort locally for now.
 */
export type StorefrontSectionInstance = {
  id: string;
  type: string;
  label: string;
  is_visible: boolean;
  sort: number;
  settings: Record<string, unknown>;
};

/** Working page copy in the builder (T1 page + local section UI fields). */
export type BuilderPage = Omit<import('types/storefront').StorefrontPage, 'sections'> & {
  sections: StorefrontSectionInstance[];
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
