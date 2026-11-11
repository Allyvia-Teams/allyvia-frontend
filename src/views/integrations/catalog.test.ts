import { createElement, isValidElement, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { PosConnection } from 'api/posIntegrations.api';

type CatalogItem = {
  id: string;
  availability: 'available' | 'coming_soon';
};

describe('integrations catalog', () => {
  it('keeps every supported and announced integration visible on the unified screen', async () => {
    const storage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined
    };
    vi.stubGlobal('sessionStorage', storage);
    vi.stubGlobal('localStorage', storage);
    const integrationsModule = await import('./index');
    const createCatalog = (
      integrationsModule as unknown as {
        createIntegrationCatalog?: () => CatalogItem[];
      }
    ).createIntegrationCatalog;

    const catalog = createCatalog?.() ?? [];

    expect(catalog.map(({ id, availability }) => ({ id, availability }))).toEqual([
      { id: 'bank', availability: 'available' },
      { id: 'quickbooks', availability: 'available' },
      { id: 'square', availability: 'available' },
      { id: 'stripe-connect', availability: 'available' },
      { id: 'stripe-billing', availability: 'available' },
      { id: 'csv', availability: 'available' },
      { id: 'shopify', availability: 'available' },
      { id: 'lightspeed', availability: 'available' },
      { id: 'clover', availability: 'coming_soon' },
      { id: 'xero', availability: 'coming_soon' }
    ]);
  });

  it('renders current and coming-soon integrations together with clear actions', async () => {
    const storage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined
    };
    vi.stubGlobal('sessionStorage', storage);
    vi.stubGlobal('localStorage', storage);
    const integrationsModule = await import('./index');
    const CatalogGrid = (
      integrationsModule as unknown as {
        IntegrationCatalogGrid?: ComponentType<{
          items: Array<CatalogItem & { name: string }>;
          statusById: Record<string, string>;
          canManage: boolean;
          onNavigate: (route: string) => void;
        }>;
      }
    ).IntegrationCatalogGrid;
    const catalog = integrationsModule.createIntegrationCatalog();
    const html = CatalogGrid
      ? renderToStaticMarkup(
          createElement(CatalogGrid, {
            items: catalog,
            statusById: { quickbooks: 'connected' },
            canManage: true,
            onNavigate: () => undefined
          })
        )
      : '';

    expect(html).toContain('QuickBooks');
    expect(html).toContain('Shopify');
    expect(html).toContain('Lightspeed');
    expect(html).toContain('Clover');
    expect(html).toContain('Xero');
    expect(html).toContain('aria-label="Manage QuickBooks"');
    const shopifyButton = html.match(/<button\b[^>]*aria-label="Connect Shopify"[^>]*>/)?.[0];
    expect(shopifyButton).toBeDefined();
    expect(shopifyButton).not.toMatch(/\bdisabled(?:=|\s|>)/);
    expect(catalog.find((item) => item.id === 'shopify')?.route).toBe('/integrations/pos/connect/shopify');
    // The file front door replaced the four-slot CSV wizard (context-graph P1b).
    expect(catalog.find((item) => item.id === 'csv')?.route).toBe('/integrations/import');
    // Lightspeed X-Series is built (context-graph P7): a live Connect button
    // on the shared OAuth wizard. Clover keeps the coming-soon path covered.
    const lightspeedButton = html.match(/<button\b[^>]*aria-label="Connect Lightspeed"[^>]*>/)?.[0];
    expect(lightspeedButton).toBeDefined();
    expect(lightspeedButton).not.toMatch(/\bdisabled(?:=|\s|>)/);
    expect(catalog.find((item) => item.id === 'lightspeed')?.route).toBe('/integrations/pos/connect/lightspeed');
    expect(catalog.find((item) => item.id === 'lightspeed')?.description).toContain('X-Series');
    expect(html).toContain('aria-label="Clover is coming soon"');
  });
});

// The grid's buttons are built inline, so calling the component returns an
// element tree whose Button props carry the real onClick. Walking it is how a
// click is exercised here without a DOM (the repo has no jsdom).
const findByAriaLabel = (node: ReactNode, label: string): ReactElement<{ onClick?: () => void }> | undefined => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findByAriaLabel(child, label);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  const props = node.props as { 'aria-label'?: string; children?: ReactNode };
  if (props['aria-label'] === label) return node as ReactElement<{ onClick?: () => void }>;
  return findByAriaLabel(props.children, label);
};

describe('POS provider cards on the integrations catalog', () => {
  const posConnection = (provider: 'lightspeed' | 'shopify', status: PosConnection['status']) =>
    ({ id: `conn-${provider}`, provider, status, latest_run: null }) as PosConnection;

  const clickCard = async (connections: PosConnection[], label: string) => {
    const storage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined
    };
    vi.stubGlobal('sessionStorage', storage);
    vi.stubGlobal('localStorage', storage);
    const { createIntegrationCatalog, IntegrationCatalogGrid, posCatalogOverrides } = await import('./index');
    const { statusById, routeById } = posCatalogOverrides?.(connections) ?? { statusById: {}, routeById: {} };
    const onNavigate = vi.fn();
    const tree = IntegrationCatalogGrid({ items: createIntegrationCatalog(), statusById, routeById, canManage: true, onNavigate });
    const button = findByAriaLabel(tree, label);
    expect(button, `no button labelled "${label}"`).toBeDefined();
    button?.props.onClick?.();
    expect(onNavigate).toHaveBeenCalledTimes(1);
    return onNavigate.mock.calls[0][0];
  };

  it('opens the connection page from a connected Lightspeed card', async () => {
    expect(await clickCard([posConnection('lightspeed', 'active')], 'Manage Lightspeed')).toBe(
      '/integrations/pos/connections/conn-lightspeed'
    );
  });

  it('still opens the wizard from a Lightspeed card with no live connection', async () => {
    expect(await clickCard([], 'Connect Lightspeed')).toBe('/integrations/pos/connect/lightspeed');
    expect(await clickCard([posConnection('lightspeed', 'disconnected')], 'Connect Lightspeed')).toBe(
      '/integrations/pos/connect/lightspeed'
    );
  });

  it('opens the connection page from a connected Shopify card', async () => {
    expect(await clickCard([posConnection('shopify', 'active')], 'Manage Shopify')).toBe('/integrations/pos/connections/conn-shopify');
  });

  it('still opens the wizard from a Shopify card with no live connection', async () => {
    expect(await clickCard([], 'Connect Shopify')).toBe('/integrations/pos/connect/shopify');
    expect(await clickCard([posConnection('shopify', 'disconnected')], 'Connect Shopify')).toBe('/integrations/pos/connect/shopify');
  });

  it('opens the connection page when a POS connection needs reconnecting', async () => {
    expect(await clickCard([posConnection('shopify', 'needs_reauth')], 'Manage Shopify')).toBe(
      '/integrations/pos/connections/conn-shopify'
    );
  });
});
