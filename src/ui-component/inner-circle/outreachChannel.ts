/**
 * The one sentence every outreach composer shows above its actions. Outreach
 * has exactly one channel now (design §4, Session 1): the consumer app tile,
 * with a push notification behind it. There is no owner-composed email and no
 * SMS — SMS carries the sign-in code and nothing else — so the sentence is a
 * statement of fact about where the thing goes, and it must read identically
 * in all three dialogs. One export, so it cannot drift into three wordings.
 */
export const OUTREACH_CHANNEL_SENTENCE =
  'Members with the app see it in their Inner Circle tile and get a notification; everyone else can still redeem it at the till.';

/**
 * The empty state of an invite list — a perk's or a round's. Both drawers
 * still offered to generate emailed invitations and pointed at a "card" this
 * redesign deleted: they named a channel Session 1 retired and a UI Session 3
 * removed, in the same sentence.
 *
 * Here rather than in either drawer, for the reason `OUTREACH_CHANNEL_SENTENCE`
 * is here: two copies of one sentence is how the email wording survived three
 * sessions of retiring email. The noun is the only thing that varies.
 */
export function inviteListEmptyMessage(kind: 'event' | 'vote'): string {
  const noun = kind === 'vote' ? 'round' : 'perk';
  return `No invites yet. Use “Invite eligible members” in Outreach to add members to this ${noun} — they see it in their Inner Circle tile.`;
}
