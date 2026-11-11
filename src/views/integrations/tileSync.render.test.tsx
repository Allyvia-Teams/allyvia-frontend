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
  it('shows the Still importing tag, and no Last synced line, during a first import', () => {
    const html = grid({ shopify: { stillImporting: true, lastSynced: null } });
    expect(html).toContain('Still importing');
    expect(html).not.toContain('Last synced');
  });

  it('shows a plain Last synced line with no chip for routine syncs', () => {
    const html = grid({ shopify: { stillImporting: false, lastSynced: 'Last synced 5 minutes ago' } });
    expect(html).toContain('Last synced 5 minutes ago');
    expect(html).not.toContain('Still importing');
    // The only chip is the connection status.
    const chipLabels = [...html.matchAll(/<span class="MuiChip-label[^"]*">([^<]*)<\/span>/g)].map((match) => match[1]);
    expect(chipLabels).toEqual(['Connected']);
  });

  it('shows neither with no sync information', () => {
    const html = grid(undefined);
    expect(html).not.toContain('Still importing');
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
