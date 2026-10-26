import { describe, expect, it } from 'vitest';

import { absoluteAssetUrl, apiPathname, relativeApiPath, shareUrl } from './apiPath';
import { PLAN_ID } from './planFixtures';

const BASE = 'http://127.0.0.1:8069/api/v1/';

describe('relativeApiPath: a server-written path made relative to the API base', () => {
  it('strips the base pathname, with or without a trailing slash on the env value', () => {
    expect(relativeApiPath(`/api/v1/buy/plans/${PLAN_ID}/lines/x/decision/`, BASE, PLAN_ID)).toBe(
      `/buy/plans/${PLAN_ID}/lines/x/decision/`
    );
    expect(relativeApiPath(`/api/v1/buy/plans/${PLAN_ID}/run/`, 'http://127.0.0.1:8069/api/v1', PLAN_ID)).toBe(
      `/buy/plans/${PLAN_ID}/run/`
    );
  });

  it("accepts only this plan's own routes", () => {
    expect(relativeApiPath('/api/v1/buy/plans/99999999-9999-4999-8999-999999999999/run/', BASE, PLAN_ID)).toBeNull();
    expect(relativeApiPath(`/api/v1/inventory/items/`, BASE, PLAN_ID)).toBeNull();
    expect(relativeApiPath(`https://evil.example/api/v1/buy/plans/${PLAN_ID}/run/`, BASE, PLAN_ID)).toBeNull();
    expect(relativeApiPath(`/api/v1/buy/plans/${PLAN_ID}/../../role/`, BASE, PLAN_ID)).toBeNull();
    expect(relativeApiPath('', BASE, PLAN_ID)).toBeNull();
  });

  it('reads the base pathname off the env value', () => {
    expect(apiPathname(BASE)).toBe('/api/v1/');
    expect(apiPathname('https://api.allyvia.co/api/v1')).toBe('/api/v1/');
  });
});

describe('absoluteAssetUrl: a picture path prefixed with the API origin only when it is a path', () => {
  it('prefixes a server path, keeps an absolute URL, refuses anything else', () => {
    expect(absoluteAssetUrl('/api/v1/buy/images/i/abc-card.webp', BASE)).toBe('http://127.0.0.1:8069/api/v1/buy/images/i/abc-card.webp');
    expect(absoluteAssetUrl('https://cdn.example.com/x/api/v1/inventory/images/i/abc-card.webp', BASE)).toBe(
      'https://cdn.example.com/x/api/v1/inventory/images/i/abc-card.webp'
    );
    expect(absoluteAssetUrl('javascript:alert(1)', BASE)).toBeNull();
    expect(absoluteAssetUrl(null, BASE)).toBeNull();
  });
});

describe("shareUrl: the link is the app's own origin, never the API's", () => {
  it('joins the page origin, the app base name and the returned path', () => {
    expect(shareUrl('/share/plan/tok', 'http://localhost:3069', '/')).toBe('http://localhost:3069/share/plan/tok');
    expect(shareUrl('/share/plan/tok', 'https://app.allyvia.co', '/os/')).toBe('https://app.allyvia.co/os/share/plan/tok');
    expect(shareUrl('/share/plan/tok', 'https://app.allyvia.co', '')).toBe('https://app.allyvia.co/share/plan/tok');
  });
});
