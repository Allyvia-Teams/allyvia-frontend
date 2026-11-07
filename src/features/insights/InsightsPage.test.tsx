import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// `store` reaches utils/axios -> utils/mockApi, which cannot load under vitest.
vi.mock('store', () => ({ useSelector: () => undefined }));

import { InsightsPageView, type InsightsPageViewProps } from './InsightsPage';
import { INSIGHTS_MOCK } from './mock/insights.mock';

const noop = () => undefined;

// Emotion inlines <style> tags next to each styled element in static markup;
// drop them so the assertions see only the rendered elements.
const stripStyles = (html: string) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');

const render = (overrides: Partial<InsightsPageViewProps> = {}) =>
  stripStyles(
    renderToStaticMarkup(
      <InsightsPageView
        load={{ status: 'ready', payload: INSIGHTS_MOCK }}
        fallbackStoreName="Acme Corporation"
        dismissedIds={[]}
        filter="all"
        modeOverride={null}
        onFilter={noop}
        onModeChange={noop}
        onRetry={noop}
        {...overrides}
      />
    )
  );

const listedIds = (html: string) => [...html.matchAll(/data-rec-id="([^"]+)"/g)].map((m) => m[1]);

describe('InsightsPageView', () => {
  it('shows the breadcrumb, title and subtitle from the payload', () => {
    const html = render();
    expect(html).toContain('Juniper &amp; Rye');
    expect(html).toContain('<h1');
    expect(html).toContain('5 recommendations for this week · refreshed today at 7:02 AM');
  });

  it('falls back to the app’s company name when the payload has none', () => {
    const html = render({ load: { status: 'ready', payload: { ...INSIGHTS_MOCK, storeName: '' } } });
    expect(html).toContain('Acme Corporation');
  });

  it('subtracts dismissed recs from the subtitle and the chips', () => {
    const html = render({ dismissedIds: ['rec-linen-markdown'] });
    expect(html).toContain('4 recommendations for this week');
    expect(html).not.toContain('data-chip="pricing"');
  });

  it('renders the chips with counts, All pressed by default', () => {
    const html = render();
    const chips = [...html.matchAll(/aria-pressed="(true|false)"[^>]*data-chip="([^"]+)"/g)].map((m) => `${m[2]}:${m[1]}`);
    expect(chips).toEqual(['all:true', 'inventory:false', 'pricing:false', 'staffing:false', 'inner_circle:false', 'cash:false']);
    expect(html).toMatch(/data-chip="all"[^>]*>All<span[^>]*>5<\/span>/);
    expect(html).toMatch(/data-chip="inner_circle"[^>]*>Inner Circle<span[^>]*>1<\/span>/);
  });

  it('lists titles by impact, and only the linen dresses under Pricing', () => {
    expect(listedIds(render())).toEqual([
      'rec-spring-deposit',
      'rec-linen-markdown',
      'rec-inner-circle-invite',
      'rec-mara-reorder',
      'rec-saturday-shift'
    ]);
    const pricing = render({ filter: 'pricing' });
    expect(listedIds(pricing)).toEqual(['rec-linen-markdown']);
    expect(pricing).toMatch(/aria-pressed="true"[^>]*data-chip="pricing"/);
  });

  it('shows Save mode from the payload and Growth mode once switched', () => {
    expect(render()).toContain('Save mode');
    expect(render()).toContain('data-mode="save"');
    const growth = render({ modeOverride: 'growth' });
    expect(growth).toContain('Growth mode');
    expect(growth).toContain('data-mode="growth"');
  });

  it('renders View history disabled while there is no history route', () => {
    expect(render()).toMatch(/<button[^>]*disabled=""[^>]*>View history/);
  });

  it('shows three skeleton rows while loading and a Retry on error', () => {
    const loading = render({ load: { status: 'loading' } });
    expect(loading).toContain('data-insights-loading');
    expect(loading.match(/class="MuiSkeleton-root/g)).toHaveLength(3);
    expect(loading).not.toContain('data-insights-list');

    const error = render({ load: { status: 'error' } });
    expect(error).toContain('role="alert"');
    expect(error).toContain('Retry');
    expect(error).not.toContain('data-chip');
  });
});
