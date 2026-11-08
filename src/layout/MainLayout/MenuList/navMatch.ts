import { matchPath } from 'react-router-dom';

import type { NavItemType } from 'types';

/**
 * Whether a sidebar item is the selected one for this pathname. By default an item matches its URL and
 * everything under it. `exact` matches the URL alone (so Inventory does not light up on /inventory/find),
 * and `also` lists prefixes that keep it lit (the pages that now live under its tabs).
 */
export const isNavItemSelected = (item: Pick<NavItemType, 'url' | 'link' | 'exact' | 'also'>, pathname: string): boolean => {
  const path = item.link ?? item.url;
  const own = path ? !!matchPath({ path, end: !!item.exact }, pathname) : false;
  if (own) return true;
  return (item.also ?? []).some((prefix) => !!matchPath({ path: prefix, end: false }, pathname));
};
