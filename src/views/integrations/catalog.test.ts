import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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
      { id: 'lightspeed', availability: 'coming_soon' },
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
    expect(html).toContain('aria-label="Lightspeed is coming soon"');
  });
});
