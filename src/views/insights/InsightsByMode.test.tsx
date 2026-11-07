import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// InsightsPage fetches on mount and reads the store; the routing is what is
// under test here, so it is a stub. (Its view is tested in InsightsPage.test.tsx.)
vi.mock('features/insights/InsightsPage', () => ({ default: () => <div data-stub="insights-page" /> }));

import InsightsByMode from './InsightsByMode';

const legacy = {
  profileCard: <div data-stub="profile-card" />,
  analytics: <div data-stub="analytics" />,
  survey: <div data-stub="survey" />
};

describe('InsightsByMode', () => {
  it('off renders today’s page: profile card, analytics, survey, and nothing new', () => {
    const html = renderToStaticMarkup(<InsightsByMode mode="off" {...legacy} />);
    expect(html).not.toContain('data-stub="insights-page"');
    expect(html).not.toContain('data-insights-section');
    const order = ['profile-card', 'analytics', 'survey'].map((s) => html.indexOf(`data-stub="${s}"`));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it.each(['mock', 'live'] as const)('%s renders InsightsPage on top, then the legacy content in two sections', (mode) => {
    const html = renderToStaticMarkup(<InsightsByMode mode={mode} {...legacy} />);
    const page = html.indexOf('data-stub="insights-page"');
    const analytics = html.indexOf('data-insights-section="analytics"');
    const profile = html.indexOf('data-insights-section="business-profile"');
    expect(page).toBeGreaterThanOrEqual(0);
    expect(analytics).toBeGreaterThan(page);
    expect(profile).toBeGreaterThan(analytics);
    expect(html).toContain('>Analytics</h2>');
    expect(html).toContain('>Business profile</h2>');
    // The profile card and survey sit inside "Business profile".
    expect(html.indexOf('data-stub="profile-card"')).toBeGreaterThan(profile);
    expect(html.indexOf('data-stub="survey"')).toBeGreaterThan(profile);
  });

  it('starts both sections collapsed, with the legacy content still mounted inside', () => {
    const html = renderToStaticMarkup(<InsightsByMode mode="mock" {...legacy} />);
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(html).not.toContain('aria-expanded="true"');
    expect(html.match(/MuiCollapse-hidden/g)).toHaveLength(2);
    // Mounted while collapsed, so the profile fetch and the analytics gate still run.
    expect(html).toContain('data-stub="profile-card"');
    expect(html).toContain('data-stub="analytics"');
  });
});
