import { absoluteImageUrl } from 'utils/imageUrl';

import type { CatalogStyle } from '../types/pos.types';

/**
 * `/pos/styles/` sends each style's card photo path-absolute
 * (`/api/v1/inventory/images/...`) unless ITEM_IMAGES_PUBLIC_BASE_URL is set,
 * and "" when the style has no photo. Resolve against the API origin so the
 * <img> does not load from the frontend's; "" stays absent (no photo).
 */
export const withStyleImageUrls = <T extends { styles: CatalogStyle[] }>(page: T, apiBase: string | null | undefined): T => ({
  ...page,
  styles: (page.styles ?? []).map((style) => ({
    ...style,
    imageUrl: absoluteImageUrl(style.imageUrl, apiBase) ?? undefined
  }))
});
