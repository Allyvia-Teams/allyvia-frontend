// Reports: the segmented control is the only in-app way to QuickBooks posting,
// and the insights page is told the resolved view so a bare Reports link opens
// on Sell-through, not on Recommendations (a duplicate of Today).
//
// Loadable is stubbed to render the props it was given, because a lazy page
// never resolves under renderToStaticMarkup.

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('ui-component/Loadable', () => ({
  default: () => (props: Record<string, unknown>) => <div data-loadable={JSON.stringify(props)} />
}));

import { readWorkspaceParams } from '../tabs';
import ReportsTab from './ReportsTab';

const render = (url: string) => {
  const { view } = readWorkspaceParams(new URLSearchParams(url.split('?')[1] ?? ''));
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[url]}>
      <ReportsTab view={view} />
    </MemoryRouter>
  );
};

const unescape = (html: string) => html.replace(/&quot;/g, '"').replace(/&amp;/g, '&');

describe('ReportsTab', () => {
  it('links to QuickBooks posting from ?tab=reports', () => {
    const html = unescape(render('/inventory?tab=reports'));
    expect(html).toMatch(/href="[^"]*view=quickbooks[^"]*"/);
    expect(html).toContain('QuickBooks posting');
  });

  it('opens the insights page on Sell-through, never Recommendations, by default', () => {
    const html = unescape(render('/inventory?tab=reports'));
    expect(html).toContain('"initialView":"sell-through"');
    expect(html).not.toContain('recommendations');
  });

  it('?view=quickbooks renders the posting screen and marks its option selected', () => {
    const html = unescape(render('/inventory?tab=reports&view=quickbooks'));
    expect(html).toContain('"logHref":"/inventory/quickbooks/log"');
    expect(html).not.toContain('initialView');
    expect(html).toMatch(/aria-pressed="true"[^>]*href="[^"]*view=quickbooks|href="[^"]*view=quickbooks[^"]*"[^>]*aria-pressed="true"/);
  });
});
