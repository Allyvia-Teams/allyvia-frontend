/**
 * Style photo URLs come off the API path-absolute (`/api/v1/inventory/images/...`)
 * unless the backend has ITEM_IMAGES_PUBLIC_BASE_URL set. A path-absolute URL
 * dropped straight into an <img> would resolve against the FRONTEND origin, not
 * the API's, so every API module that returns one prefixes the API origin here.
 * Pure so it can be tested without axios (house rule: api modules are untestable).
 */
export const absoluteImageUrl = (url: string | null | undefined, apiBase: string | null | undefined): string | null => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!apiBase) return url;
  try {
    return new URL(apiBase, 'http://localhost').origin + url;
  } catch {
    return url;
  }
};

/** The server's one-sentence refusal (`detail`) when a photo upload is rejected, else null. */
export const photoErrorDetail = (data: unknown): string | null => {
  if (data && typeof data === 'object' && typeof (data as { detail?: unknown }).detail === 'string') {
    return (data as { detail: string }).detail;
  }
  return null;
};
