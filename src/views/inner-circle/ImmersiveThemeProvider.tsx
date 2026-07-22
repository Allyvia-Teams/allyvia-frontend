import { createContext, ReactNode, useContext } from 'react';

// project imports
import { ImmersiveSurfaces } from 'themes/immersiveTheme';

interface ImmersiveContextValue {
  active: boolean;
  surfaces: ImmersiveSurfaces | null;
}

// Always the inactive/neutral state — see the passthrough note below. Kept as the context
// default (rather than a Provider further down) so useImmersive() resolves it with zero
// runtime cost and consumers never need a null-check on the context itself.
const ImmersiveContext = createContext<ImmersiveContextValue>({ active: false, surfaces: null });

export function useImmersive(): ImmersiveContextValue {
  return useContext(ImmersiveContext);
}

// ==============================|| INNER CIRCLE - IMMERSIVE THEME PROVIDER ||============================== //

// 2026-07-21 chrome-only-theming addendum: the brand template now themes the CHROME
// (sidebar + header, via resolveChromeTheme in MainLayout) app-wide. CONTENT — including Inner
// Circle — stays on the global light theme everywhere, so tables/status chips/charts are always
// legible. The scoped dark "branded zone" treatment this provider used to build (resolveZoneTheme
// + buildTemplateSurfaces, still exported from themes/immersiveTheme for the chrome engine and its
// tests) no longer applies to Inner Circle content, so this is now a pure passthrough.
//
// The provider/import is kept intact (not deleted, not unwrapped from MainRoutes) so a future
// route-scoped treatment has a hook to reattach to; useImmersive() simply resolves to the inactive
// context default above, and consumers (InnerCirclePage's hero band / logo watermark) already
// guard on `active`/`surfaces` and degrade to their plain light-theme rendering.
export default function ImmersiveThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
