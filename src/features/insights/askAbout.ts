// "Ask about this" on the rationale panel.
//
// The chat is the Insights chat (insightChat.ts, InsightChatRail): InsightsPage builds an InsightChat from it
// when the first read says the chat exists for this person, and passes it here. With none (the chat is off, a
// member, mock data, or a surface with no rail such as Inventory's Today tab) the button says "Coming soon" and
// a click only logs what it would have sent. A card with no Recommendation id behind it cannot be attached, so
// its button stays unavailable too.

import type { Recommendation } from './types';

export interface InsightChatSeed {
  message: string;
  /** The `Recommendation` id the server takes (not the pending row's id). */
  context: { recommendationId: string };
}

export interface InsightChat {
  open: (seed: InsightChatSeed) => void;
}

export const askMessage = (title: string): string => `Tell me more about: ${title}`;

/** Whether this card could be put in the chat at all. */
export const canAsk = (rec: Pick<Recommendation, 'recommendationId'>): boolean => !!rec.recommendationId;

export function askAboutInsight(
  rec: Pick<Recommendation, 'id' | 'title' | 'recommendationId'>,
  chat: InsightChat | null = null
): 'opened' | 'unavailable' {
  const message = askMessage(rec.title);
  if (chat && rec.recommendationId) {
    chat.open({ message, context: { recommendationId: rec.recommendationId } });
    return 'opened';
  }
  console.info(`[insights-redesign] askAboutInsight(${rec.id}): no chat for this card; would send "${message}"`);
  return 'unavailable';
}
