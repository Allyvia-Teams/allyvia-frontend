// "Ask about this" on the rationale panel (S4).
//
// The brief wants the agent chat opened and seeded with "Tell me more about:
// <title>" plus the rec id. There is no such chat reachable from /insights:
// the only chat in the app is the buy planner's ChatRail
// (src/views/inventory/plan/components/ChatRail.tsx), which is bound to one
// inventory plan and lives inside Inventory › Plan, and the header's "Chat"
// mega-menu entry is a template link to '#!'. So INSIGHT_CHAT is null, the
// button carries a "Coming soon" tooltip, and a click logs what it would send.
// When an agent chat exists, implement InsightChat over it and set
// INSIGHT_CHAT; the card enables the button from that alone.

import type { Recommendation } from './types';

export interface InsightChatSeed {
  message: string;
  context: { recommendationId: string };
}

export interface InsightChat {
  open: (seed: InsightChatSeed) => void;
}

export const INSIGHT_CHAT: InsightChat | null = null;

export const askMessage = (title: string): string => `Tell me more about: ${title}`;

export function askAboutInsight(
  rec: Pick<Recommendation, 'id' | 'title'>,
  chat: InsightChat | null = INSIGHT_CHAT
): 'opened' | 'unavailable' {
  const message = askMessage(rec.title);
  if (chat) {
    chat.open({ message, context: { recommendationId: rec.id } });
    return 'opened';
  }
  console.info(`[insights-redesign] askAboutInsight(${rec.id}): no agent chat on /insights yet; would send "${message}"`);
  return 'unavailable';
}
