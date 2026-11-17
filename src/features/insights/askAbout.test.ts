import { afterEach, describe, expect, it, vi } from 'vitest';

import { askAboutInsight, askMessage, canAsk, type InsightChat } from './askAbout';
import { INSIGHTS_MOCK } from './mock/insights.mock';

const mara = INSIGHTS_MOCK.recommendations[0];
const live = { ...mara, id: 'pending-1', recommendationId: 'rec-1' };

afterEach(() => vi.restoreAllMocks());

describe('Ask about this', () => {
  it('seeds the chat with the title and passes the Recommendation id as context', () => {
    const chat: InsightChat = { open: vi.fn() };
    expect(askAboutInsight(live, chat)).toBe('opened');
    expect(chat.open).toHaveBeenCalledWith({
      message: 'Tell me more about: Reorder the Mara cable-knit sweater in M and L before Saturday',
      context: { recommendationId: 'rec-1' }
    });
  });

  it('with no chat it logs the intent instead', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    expect(askAboutInsight(live)).toBe('unavailable');
    expect(info).toHaveBeenCalledWith(
      '[insights-redesign] askAboutInsight(pending-1): no chat for this card; would send "Tell me more about: Reorder the Mara cable-knit sweater in M and L before Saturday"'
    );
  });

  it('a card with no Recommendation id behind it cannot be asked about, even when there is a chat', () => {
    const chat: InsightChat = { open: vi.fn() };
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    expect(canAsk(mara)).toBe(false);
    expect(canAsk(live)).toBe(true);
    expect(askAboutInsight(mara, chat)).toBe('unavailable');
    expect(chat.open).not.toHaveBeenCalled();
  });

  it('words the seed message', () => {
    expect(askMessage('Add shift')).toBe('Tell me more about: Add shift');
  });
});
