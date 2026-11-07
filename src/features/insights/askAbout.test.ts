import { afterEach, describe, expect, it, vi } from 'vitest';

import { askAboutInsight, askMessage, INSIGHT_CHAT, type InsightChat } from './askAbout';
import { INSIGHTS_MOCK } from './mock/insights.mock';

const mara = INSIGHTS_MOCK.recommendations[0];

afterEach(() => vi.restoreAllMocks());

describe('Ask about this', () => {
  it('seeds the chat with the title and passes the rec id as context', () => {
    const chat: InsightChat = { open: vi.fn() };
    expect(askAboutInsight(mara, chat)).toBe('opened');
    expect(chat.open).toHaveBeenCalledWith({
      message: 'Tell me more about: Reorder the Mara cable-knit sweater in M and L before Saturday',
      context: { recommendationId: 'rec-mara-reorder' }
    });
  });

  it('has no chat reachable from /insights today, so it logs the intent instead', () => {
    expect(INSIGHT_CHAT).toBeNull();
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    expect(askAboutInsight(mara)).toBe('unavailable');
    expect(info).toHaveBeenCalledWith(
      '[insights-redesign] askAboutInsight(rec-mara-reorder): no agent chat on /insights yet; would send "Tell me more about: Reorder the Mara cable-knit sweater in M and L before Saturday"'
    );
  });

  it('words the seed message', () => {
    expect(askMessage('Add shift')).toBe('Tell me more about: Add shift');
  });
});
