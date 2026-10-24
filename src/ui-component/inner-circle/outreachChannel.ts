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
 * The sentence for an EVENT PROMO (E6). Its code goes only to the members its
 * group names, so "everyone else can still redeem it at the till" — true of a
 * tier discount — is false here; and the code works only on the promo's days.
 * The first clause is the shared one, verbatim.
 */
export const OUTREACH_CHANNEL_SENTENCE_EVENT =
  'Members with the app see it in their Inner Circle tile and get a notification; the code works at the till only on the promo’s days.';

/**
 * The event sentence for its LAST day and after (review round 3). Activation
 * queues the notification and the overnight send skips it once the store's
 * last day has ended — and neither the store's day nor the send's hour is
 * known in the browser — so on the last day a notification MAY not arrive.
 * Chosen by `eventChannelSentence` (views/inner-circle/eventPromo.ts).
 */
export const OUTREACH_CHANNEL_SENTENCE_EVENT_LAST_DAY =
  'Members with the app see it in their Inner Circle tile, but on its last day a notification may not reach them; the code works at the till only on the promo’s days.';

/**
 * The event sentence for a promo that is ON (review round 4): its code is
 * already in the members' tiles, and the notification went with the overnight
 * send after it was switched on — nothing more is promised.
 */
export const OUTREACH_CHANNEL_SENTENCE_EVENT_LIVE =
  'Members in its group have the code in their Inner Circle tile; it works at the till only on the promo’s days.';

/**
 * The channel sentence for one kind. One function, so the wordings cannot
 * drift into five and so a new kind has to choose on purpose.
 */
export function channelSentenceFor(kind: 'discount' | 'event' | 'vote' | 'event_promo'): string {
  if (kind === 'discount') return OUTREACH_CHANNEL_SENTENCE;
  if (kind === 'event_promo') return OUTREACH_CHANNEL_SENTENCE_EVENT;
  return OUTREACH_CHANNEL_SENTENCE_NO_TILL;
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
