/**
 * Where "Back to Integrations" goes from a connector page.
 *
 * The hub has lived in Settings since 2026-09-11. Linking to `/integrations`
 * instead routes through the `<Navigate>` in MainRoutes, which drops any query
 * string it was given — which is how the old `?hub=true` back link ended up in
 * a loop with the auto-redirect the hub used to run: the param was gone by the
 * time the hub mounted, so it bounced you straight back to the connector you
 * had just left. Keep the real destination here, not a path that redirects.
 */
export const INTEGRATIONS_HUB_ROUTE = '/settings?tab=integrations';
