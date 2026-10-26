// Paths the backend writes, made safe to use from the browser (Inventory › Plan, buy planner B9).
//
// - A confirm card's `path` and a receipt match's `unlink` are absolute server paths (`/api/v1/buy/…`) while
//   the app's axios instance already carries the API base, so they are made relative to it, and only this
//   plan's own routes pass: a card can never point the page at another plan or another resource.
// - A picture is a server path (`/api/v1/buy/images/…`), or already absolute when a style's picture lives on a
//   public base URL; only a path is prefixed with the API origin.
// - A share link is the app's own page (`/share/plan/<token>`), so it is built on the page's origin and the
//   app's base name, never on the API's.

/** The API base's own pathname, with a trailing slash (`/api/v1/`), whether or not the env value has one. */
export const apiPathname = (apiBase: string): string => {
  const path = new URL(apiBase).pathname;
  return path.endsWith('/') ? path : `${path}/`;
};

const SAFE_TAIL = /^[A-Za-z0-9_\-/.]*$/;

/** The server path relative to the API base (`/buy/plans/<id>/…`), or null when it is not one of this plan's. */
export const relativeApiPath = (path: string, apiBase: string, planId: string): string | null => {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return null;
  const prefix = `${apiPathname(apiBase)}buy/plans/${planId}/`;
  if (!path.startsWith(prefix)) return null;
  const tail = path.slice(prefix.length);
  if (!SAFE_TAIL.test(tail) || tail.split('/').some((segment) => segment === '..' || segment === '.')) return null;
  return `/buy/plans/${planId}/${tail}`;
};

/** A picture's URL: a server path gets the API origin; an absolute http(s) URL stays; anything else is no picture. */
export const absoluteAssetUrl = (url: string | null | undefined, apiBase: string): string | null => {
  if (!url) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return `${new URL(apiBase).origin}${url}`;
  if (/^https?:\/\//i.test(url)) return url;
  return null;
};

/** The share link: the page's origin, the app's base name, the path the server returned. */
export const shareUrl = (path: string, origin: string, baseName: string | undefined): string => {
  const base = (baseName || '/').replace(/\/+$/, '');
  return `${origin}${base}${path.startsWith('/') ? path : `/${path}`}`;
};
