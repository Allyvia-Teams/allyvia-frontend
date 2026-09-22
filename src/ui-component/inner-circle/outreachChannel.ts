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
 * The same sentence without the till clause, for the two kinds that have
 * NOTHING TO REDEEM.
 *
 * "…everyone else can still redeem it at the till" is true of a discount code
 * and false of an event invitation and of a ballot: there is no code, and a
 * member without the app cannot RSVP or vote at a till. The sentence was
 * written discount-shaped and then placed on all three kinds. The first
 * clause is verbatim in both versions — that clause is the constraint (one
 * channel, no choice to make), and the second is a redemption fact that only
 * applies where something is redeemable.
 */
export const OUTREACH_CHANNEL_SENTENCE_NO_TILL = 'Members with the app see it in their Inner Circle tile and get a notification.';

/**
 * The channel sentence for one kind. One function, so the two wordings cannot
 * drift into five and so a new kind has to choose on purpose.
 */
export function channelSentenceFor(kind: 'discount' | 'event' | 'vote'): string {
  return kind === 'discount' ? OUTREACH_CHANNEL_SENTENCE : OUTREACH_CHANNEL_SENTENCE_NO_TILL;
}

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
