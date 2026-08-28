/**
 * The tier journey a customer sees on their public profile.
 *
 * THE BUG THIS FIXES IS CUSTOMER-FACING. A boutique on a ladder currently
 * gets three different vocabularies on one screen: the header chip reads the
 * legacy projection ("Vault"), the journey renders the fixed three-node
 * Shopper -> Regular -> Vault, and the footer reads the ladder progress ("$300
 * more to unlock Platinum"). Their own customer sees all three at once.
 *
 * WHY ONLY TWO NODES FOR A LADDER: the payload carries the current and next
 * rung and nothing else — never the full list — and the page is token-authed
 * and cannot call the merchant ladder endpoint. Two honest nodes beat three
 * wrong ones. A full journey needs a `ladder` key on the profile payload,
 * which is a backend change and deliberately not part of this.
 */

export interface JourneyProgress {
  current_tier: string | null;
  next_tier: string | null;
}

export interface JourneyNode {
  key: string;
  label: string;
  achieved: boolean;
  current: boolean;
}

const LEGACY_ORDER = ['shopper', 'regular', 'vault'] as const;
const LEGACY_NEXT: Record<string, string | null> = { shopper: 'regular', regular: 'vault', vault: null };
const LEGACY_LABELS: Record<string, string> = { shopper: 'Shopper', regular: 'Regular', vault: 'Vault' };

/**
 * Is this the built-in three-tier journey?
 *
 * Name matching is the ONLY signal available: in both modes the payload
 * returns the same six keys with no structural marker. Requiring the
 * successor to match too keeps it tight.
 *
 * KNOWN AND ACCEPTED LIMIT: a ladder whose rungs are named exactly Shopper,
 * Regular and Vault reads as legacy — which is harmless, because the
 * rendering is then correct by construction. The real false positive needs a
 * ladder like [Shopper, Regular, Vault, Platinum], where a customer sitting
 * on Regular would see the three-node journey and never learn Platinum
 * exists. That is adversarial naming; do not "fix" it by loosening the test,
 * which would break every genuine legacy boutique instead.
 */
export function isLegacyJourney(progress: JourneyProgress): boolean {
  const current = (progress.current_tier || '').toLowerCase();
  if (!(LEGACY_ORDER as readonly string[]).includes(current)) return false;
  const next = progress.next_tier ? progress.next_tier.toLowerCase() : null;
  return next === LEGACY_NEXT[current];
}

/**
 * The nodes to render. Three for a legacy boutique — byte-identical to what
 * shipped before, so no existing customer sees a change — and at most two for
 * a ladder.
 */
export function buildTierJourney(progress: JourneyProgress): JourneyNode[] {
  const current = progress.current_tier || '';

  if (isLegacyJourney(progress)) {
    const currentIndex = LEGACY_ORDER.indexOf(current.toLowerCase() as (typeof LEGACY_ORDER)[number]);
    return LEGACY_ORDER.map((tier, index) => ({
      key: tier,
      label: LEGACY_LABELS[tier],
      achieved: index <= currentIndex,
      current: index === currentIndex
    }));
  }

  if (!current) return [];

  const nodes: JourneyNode[] = [{ key: current, label: current, achieved: true, current: true }];
  if (progress.next_tier) {
    nodes.push({ key: progress.next_tier, label: progress.next_tier, achieved: false, current: false });
  }
  return nodes;
}
