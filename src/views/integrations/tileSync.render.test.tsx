import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { ImportBanner } from './tileSync';

// index.tsx reaches the API clients, which read storage when imported.
const storage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined, clear: () => undefined };

type IndexModule = typeof import('./index');
let mod: IndexModule;

beforeAll(async () => {
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('localStorage', storage);
  mod = await import('./index');
});

const grid = (syncById: Parameters<IndexModule['IntegrationCatalogGrid']>[0]['syncById']) =>
  renderToStaticMarkup(
    <mod.IntegrationCatalogGrid
      items={mod.createIntegrationCatalog().filter((item) => item.id === 'shopify')}
      statusById={{ shopify: 'connected' }}
      syncById={syncById}
      canManage
      onNavigate={() => undefined}
    />
  );

describe('integration tiles', () => {
  const chipLabels = (html: string) => [...html.matchAll(/<span class="MuiChip-label[^"]*">([^<]*)<\/span>/g)].map((match) => match[1]);

  it('shows the Still importing tag, and no Last synced line, during a first import', () => {
    const html = grid({ shopify: { tag: { label: 'Still importing', color: 'primary' }, reason: null, lastSynced: null } });
    expect(chipLabels(html)).toEqual(['Still importing', 'Connected']);
    expect(html).toContain('MuiChip-colorPrimary');
    expect(html).not.toContain('Last synced');
  });

  it('shows Review needed in the warning colour while an import waits for approval', () => {
    const html = grid({ shopify: { tag: { label: 'Review needed', color: 'warning' }, reason: null, lastSynced: null } });
    expect(chipLabels(html)).toEqual(['Review needed', 'Connected']);
    expect(html).toContain('MuiChip-colorWarning');
    expect(html).not.toContain('Still importing');
  });

  it('shows Import failed in the error colour with the reason when the first import failed', () => {
    const html = grid({
      shopify: { tag: { label: 'Import failed', color: 'error' }, reason: 'Shopify refused the token.', lastSynced: null }
    });
    expect(chipLabels(html)).toEqual(['Import failed', 'Connected']);
    expect(html).toContain('MuiChip-colorError');
    expect(html).toContain('Shopify refused the token.');
  });

  it('shows a plain Last synced line with no chip for routine syncs', () => {
    const html = grid({ shopify: { tag: null, reason: null, lastSynced: 'Last synced 5 minutes ago' } });
    expect(html).toContain('Last synced 5 minutes ago');
    // The only chip is the connection status.
    expect(chipLabels(html)).toEqual(['Connected']);
  });

  it('shows neither with no sync information', () => {
    const html = grid(undefined);
    expect(chipLabels(html)).toEqual(['Connected']);
    expect(html).not.toContain('Last synced');
  });
});

describe('ImportBannerAlert', () => {
  const render = (banner: ImportBanner | null) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <mod.ImportBannerAlert banner={banner} />
      </MemoryRouter>
    );

  it('renders nothing with no first import running or waiting', () => {
    expect(render(null)).toBe('');
  });

  it('says what is still importing, and links each review to its report', () => {
    const html = render({
      importing: 'Still importing from QuickBooks. Figures across Allyvia may be incomplete until it finishes.',
      reviews: [
        {
          key: 'pos:c1',
          text: 'Your Shopify import is ready to review. Nothing has been written yet.',
          path: '/integrations/pos/runs/r9/report'
        }
      ]
    });
    expect(html).toContain('Still importing from QuickBooks.');
    expect(html).toContain('Your Shopify import is ready to review. Nothing has been written yet.');
    expect(html).toContain('href="/integrations/pos/runs/r9/report"');
    expect(html).toContain('>Open<');
  });
});
