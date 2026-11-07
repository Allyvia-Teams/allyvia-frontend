import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { INSIGHTS_MOCK } from '../mock/insights.mock';
import type { Recommendation } from '../types';
import RecommendationCard from './RecommendationCard';

const noop = () => undefined;
const stripStyles = (html: string) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
const rec = (id: string) => INSIGHTS_MOCK.recommendations.find((r) => r.id === id)!;
const render = (r: Recommendation) =>
  stripStyles(renderToStaticMarkup(<RecommendationCard rec={r} onPrimary={noop} onDismiss={noop} onRationale={noop} />));
// Text content with tags removed, so assertions read like the screen.
const text = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');

describe('RecommendationCard', () => {
  it('is a region named by its title', () => {
    const html = render(rec('rec-mara-reorder'));
    expect(html).toMatch(/^<section[^>]*aria-labelledby="insight-rec-mara-reorder-title"/);
    expect(html).toMatch(
      /<h2[^>]*id="insight-rec-mara-reorder-title"[^>]*>Reorder the Mara cable-knit sweater in M and L before Saturday<\/h2>/
    );
  });

  it('shows the meta line with middle dots, the summary and the impact label', () => {
    const r = rec('rec-mara-reorder');
    const screen = text(render(r));
    expect(screen).toContain('Inventory · Order by 5 PM today · High confidence');
    expect(screen).toContain(r.summary);
    expect(screen).toContain('+$1,140');
    expect(screen).toContain('revenue protected');
    expect(screen).not.toMatch(/ [-–—] /);
  });

  it('puts a plus only on signed impacts: the cash card reads $4,200', () => {
    const cash = text(render(rec('rec-spring-deposit')));
    expect(cash).toContain('$4,200');
    expect(cash).not.toContain('+$4,200');
    expect(cash).toContain('kept on hand in Nov');
    expect(text(render(rec('rec-linen-markdown')))).toContain('+$2,050');
  });

  it('renders the primary action, Dismiss and the rationale toggle as buttons', () => {
    const html = render(rec('rec-inner-circle-invite'));
    const buttons = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((m) => text(m[1]).trim());
    expect(buttons).toEqual(['Review invite', 'Dismiss', 'See rationale and 4 facts']);
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>See rationale/);
  });

  it('counts each mock card’s facts on the toggle', () => {
    const counts = ['rec-mara-reorder', 'rec-saturday-shift', 'rec-linen-markdown', 'rec-inner-circle-invite', 'rec-spring-deposit'].map(
      (id) => text(render(rec(id))).match(/See rationale and (\d+) facts/)?.[1]
    );
    expect(counts).toEqual(['6', '5', '5', '4', '5']);
  });

  it('counts signals, not facts, on a live card whose detail has not loaded', () => {
    const live = { ...rec('rec-mara-reorder'), facts: [], signalCount: 3 };
    expect(text(render(live))).toContain('See rationale and 3 signals');
    expect(text(render({ ...live, signalCount: 0 }))).toMatch(/See rationale$/);
  });

  it('tints the icon tile and label by category', () => {
    expect(render(rec('rec-saturday-shift'))).toContain('data-category-tile="staffing"');
    expect(text(render(rec('rec-saturday-shift')))).toContain('Staffing · Schedule by Thursday · Medium confidence');
  });

  it('drops an unknown impact and an empty deadline (live gaps)', () => {
    const live = { ...rec('rec-mara-reorder'), deadline: '', impact: { amount: 0, label: '', signed: false } };
    const html = render(live);
    expect(html).not.toContain('data-impact');
    expect(text(html)).toContain('Inventory · High confidence');
  });
});
