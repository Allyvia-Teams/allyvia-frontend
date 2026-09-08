import { describe, expect, it } from 'vitest';

import { buildCrmRedirectTarget, parsePipelineView, parseSectionTab, SECTION_TABS } from './navigation';

describe('parseSectionTab', () => {
  it('accepts every valid section', () => {
    // Derived from SECTION_TABS so this loop can never drift again — it had
    // already fallen behind by one tab ('style-vote') before this.
    for (const tab of SECTION_TABS) {
      expect(parseSectionTab(tab)).toBe(tab);
    }
  });

  it('pins the exact tab set, so a new tab is added here on purpose', () => {
    expect([...SECTION_TABS]).toEqual(['members', 'pipeline', 'promotions', 'approvals', 'perks', 'style-vote', 'tiers', 'benefits']);
  });

  it('falls back to members for null or junk', () => {
    expect(parseSectionTab(null)).toBe('members');
    expect(parseSectionTab('contacts')).toBe('members');
    expect(parseSectionTab('')).toBe('members');
  });
});

describe('parsePipelineView', () => {
  it('returns deals only for the exact value', () => {
    expect(parsePipelineView('deals')).toBe('deals');
  });

  it('falls back to leads otherwise', () => {
    expect(parsePipelineView('leads')).toBe('leads');
    expect(parsePipelineView(null)).toBe('leads');
    expect(parsePipelineView('junk')).toBe('leads');
  });
});

describe('buildCrmRedirectTarget', () => {
  const params = (query: string) => new URLSearchParams(query);

  it('maps bare /crm to members', () => {
    expect(buildCrmRedirectTarget(params(''))).toBe('/inner-circle?tab=members');
  });

  it('maps contacts to members, preserving recordId', () => {
    expect(buildCrmRedirectTarget(params('tab=contacts'))).toBe('/inner-circle?tab=members');
    expect(buildCrmRedirectTarget(params('tab=contacts&recordId=abc-123'))).toBe('/inner-circle?tab=members&recordId=abc-123');
  });

  it('maps leads and deals to pipeline with the right view, preserving recordId', () => {
    expect(buildCrmRedirectTarget(params('tab=leads'))).toBe('/inner-circle?tab=pipeline&view=leads');
    expect(buildCrmRedirectTarget(params('tab=deals&recordId=d-1'))).toBe('/inner-circle?tab=pipeline&view=deals&recordId=d-1');
  });

  it('maps tasks and notes to members and drops recordId (legacy CRM never resolved it)', () => {
    expect(buildCrmRedirectTarget(params('tab=tasks&recordId=t-1'))).toBe('/inner-circle?tab=members');
    expect(buildCrmRedirectTarget(params('tab=notes'))).toBe('/inner-circle?tab=members');
  });

  it('maps unknown tabs to members without recordId', () => {
    expect(buildCrmRedirectTarget(params('tab=documents&recordId=x'))).toBe('/inner-circle?tab=members');
  });
});
