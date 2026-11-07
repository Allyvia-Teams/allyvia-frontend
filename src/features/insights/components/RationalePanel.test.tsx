import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { INSIGHTS_MOCK } from '../mock/insights.mock';
import type { DetailLoad } from '../rationale';
import type { Recommendation } from '../types';
import RationalePanel from './RationalePanel';

const noop = () => undefined;
const stripStyles = (html: string) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
const rec = (id: string) => INSIGHTS_MOCK.recommendations.find((r) => r.id === id)!;
const ready = (r: Recommendation): DetailLoad => ({
  status: 'ready',
  detail: { rationale: r.rationale, facts: r.facts, signalCount: r.signalCount }
});
const render = (r: Recommendation, load: DetailLoad, askAvailable = false) =>
  stripStyles(renderToStaticMarkup(<RationalePanel rec={r} load={load} askAvailable={askAvailable} onRetry={noop} onAsk={noop} />));

describe('RationalePanel', () => {
  const mara = rec('rec-mara-reorder');

  it('shows the narrative under the Why label', () => {
    const screen = text(render(mara, ready(mara)));
    expect(screen).toContain('Why Allyvia recommends this');
    expect(screen).toContain(mara.rationale.narrative);
  });

  it('numbers the four steps in an ordered list', () => {
    const html = render(mara, ready(mara));
    const list = html.match(/<ol[^>]*>([\s\S]*?)<\/ol>/)?.[1] ?? '';
    const items = [...list.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]));
    expect(items).toEqual([
      '1 Spotted Mara selling well above its 8-week baseline',
      '2 Matched this week to the closest precedent: Nov 15 to 21, 2025',
      '3 Checked floor stock and vendor lead time against the forecast',
      '4 Sized the order to the forecast, not the spike, because you are in Save mode'
    ]);
  });

  it('renders all six Mara facts with the mock’s exact source, label, value and sub-line', () => {
    const html = render(mara, ready(mara));
    const rows = [...html.matchAll(/<li[^>]*data-fact-row[^>]*>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]));
    expect(rows).toEqual([
      'Sales history Units sold, last 10 days 14 2.3x its November average',
      'Inventory On the floor now 3 M · 2 L None in back stock',
      'Weather Forecast, Thu to Sun 28 to 33°F lows First freeze of the season',
      'Local events IU home game, Sat Nov 14 52,000 Expected attendance',
      'Sales history Same week last year 19 sold Sold out of M by Sat 2 PM',
      'Inventory Vendor lead time 4 days Average of last 5 orders'
    ]);
    expect(html).toContain('data-fact-source="weather"');
  });

  it('shows the footer and the Ask button', () => {
    const screen = text(render(mara, ready(mara)));
    expect(screen).toContain('Built from 6 signals · last checked 7:02 AM');
    expect(screen).toContain('Ask about this');
  });

  it('keeps the Why label but drops the list when there are no steps (live)', () => {
    const load = ready({ ...mara, rationale: { ...mara.rationale, steps: [] } });
    const html = render(mara, load);
    expect(text(html)).toContain('Why Allyvia recommends this');
    expect(html).not.toMatch(/<ol/);
  });

  it('says so in the facts box when there are no facts', () => {
    const html = render(mara, ready({ ...mara, facts: [] }));
    expect(text(html)).toContain('The facts behind it');
    expect(text(html)).toContain('No supporting facts were recorded for this recommendation.');
    expect(html).not.toContain('data-fact-row');
  });

  it('shows a two-column skeleton while the detail loads', () => {
    const html = render(mara, { status: 'loading' });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('MuiSkeleton');
    expect(text(html)).not.toContain(mara.rationale.narrative);
  });

  it('shows an inline error with Retry when the detail fails', () => {
    const html = render(mara, { status: 'error' });
    expect(html).toMatch(/role="alert"/);
    expect(text(html)).toContain('Could not load the rationale.');
    expect(text(html)).toContain('Retry');
  });

  it('marks Ask about this as coming soon when no chat is reachable', () => {
    const html = render(mara, ready(mara), false);
    expect(html).toMatch(/<button[^>]*aria-disabled="true"[^>]*>[\s\S]*Ask about this/);
    expect(html).toMatch(/coming soon/i);
    expect(render(mara, ready(mara), true)).not.toContain('aria-disabled="true"');
  });
});
