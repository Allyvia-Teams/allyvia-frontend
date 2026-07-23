import { createContext, ReactNode, useContext } from 'react';

/**
 * Minimal shape the (now-passthrough) immersive context still exposes. Kept local rather than
 * imported from `themes/immersiveTheme` — the template engine no longer emits a hero-band surface
 * bundle (see the 6-template layer model). `surfaces` is always null here; the type only needs the
 * `headerBand` field that InnerCirclePage's guarded hero-band code reads.
 */
interface ImmersiveSurfaces {
  headerBand: [string, string];
}

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

// 2026-07-21 template-gallery model: brand theming is now applied entirely in MainLayout via two
// route-gated ThemeProviders (chrome via resolveChromeTheme, content via resolveContentTheme) — see
// docs/superpowers/specs/2026-07-21-template-gallery-design.md. MainLayout's zone/route gate already
// covers the Inner Circle zone, so this provider does no theming of its own; it is a pure
// passthrough. (The old resolveZoneTheme/buildTemplateSurfaces surface-bundle exports it once used
// were removed with that redesign.)
//
// The provider/import is kept intact (not deleted, not unwrapped from MainRoutes) so a future
// route-scoped treatment has a hook to reattach to; useImmersive() simply resolves to the inactive
// context default above, and consumers (InnerCirclePage's hero band / logo watermark) already
// guard on `active`/`surfaces` and degrade to their plain light-theme rendering.
export default function ImmersiveThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
