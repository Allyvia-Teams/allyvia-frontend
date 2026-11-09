// Pins which signed-in routes sit behind MemberGuard, so a later edit to the
// route table cannot drop it silently. On a locked kiosk the owner's session is
// still signed in underneath: a signed-in route without MemberGuard is one
// typed URL away from anyone at the counter.

import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('utils/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } }
}));

import AuthGuard from 'utils/route-guard/AuthGuard';
import MemberGuard from './guards/memberGuard';

type RouteNode = { path?: string; element?: ReactElement<{ children?: ReactElement }>; children?: RouteNode[] };

/** AuthGuard directly wrapping MemberGuard: the main layout's nesting. */
const isAuthThenMember = (element: RouteNode['element']) =>
  element?.type === AuthGuard && (element.props.children as ReactElement | undefined)?.type === MemberGuard;

// MainRoutes pulls in the whole app's eager imports, hence the timeouts.
describe('route table', () => {
  it('wraps the subscription pages in AuthGuard > MemberGuard', { timeout: 30_000 }, async () => {
    const { default: MainRoutes } = await import('./MainRoutes');
    const top = MainRoutes.children as RouteNode[];
    for (const path of ['/paymentplan', '/checkout/success', '/onboarding/branding']) {
      const route = top.find((r) => r.path === path);
      expect(route, path).toBeDefined();
      expect(isAuthThenMember(route!.element), path).toBe(true);
    }
  });

  it('wraps the main layout in AuthGuard > MemberGuard', { timeout: 30_000 }, async () => {
    const { default: MainRoutes } = await import('./MainRoutes');
    const layout = (MainRoutes.children as RouteNode[]).find((r) => r.path === '/' && r.children);
    expect(isAuthThenMember(layout?.element)).toBe(true);
  });

  it('wraps the OAuth callbacks and maintenance pages in AuthGuard > MemberGuard', { timeout: 30_000 }, async () => {
    const { default: AuthenticationRoutes } = await import('./AuthenticationRoutes');
    expect(isAuthThenMember(AuthenticationRoutes.element as RouteNode['element'])).toBe(true);
    expect((AuthenticationRoutes.children as RouteNode[]).map((r) => r.path)).toContain('/quickbooks-callback');
  });

  it('leaves every top-level MainRoutes entry behind MemberGuard', { timeout: 30_000 }, async () => {
    const { default: MainRoutes } = await import('./MainRoutes');
    for (const route of MainRoutes.children as RouteNode[]) expect(isAuthThenMember(route.element), route.path).toBe(true);
  });
});
