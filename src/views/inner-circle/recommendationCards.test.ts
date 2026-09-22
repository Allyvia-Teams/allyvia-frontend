import { describe, expect, it } from 'vitest';

import type { OutreachRecommendation } from 'api/innerCircle.api';

import {
  adaptOutreachCards,
  adaptPerkRecommendation,
  audienceContextLine,
  buildPostureLine,
  caseRows,
  cardKindLabel,
  composerSnapshot,
  confidenceLabel,
  COST_NONE,
  COST_NOT_ESTIMATED,
  COST_OWNER_INPUT,
  costRow,
  DASHBOARD_HANDOFF_EMPTY_COPY,
  droppedCardsMessage,
  EMPTY_COPY,
  formatMoney,
  handoffPlacement,
  hasCases,
  hasCost,
  healthRow,
  innerCircleHandoffLabel,
  intentChipLabel,
  isPerkSettingsCard,
  needsRemovedRuleNotice,
  nextStepAfterAccept,
  PERK_SETTINGS_FALLBACK_TITLE,
  PERK_SETTINGS_HREF,
  postureChipColor,
  CAP_REASONS,
  GAP_REASONS,
  REASON_COPY,
  reasonCopy,
  REFRESH_FAILED_MESSAGE,
  REFRESH_NOTHING_NEW,
  refreshOutcomeMessage,
  RULE_REMOVED_NOTICE,
  REFRESH_THROTTLED_MESSAGE,
  refreshErrorMessage,
  showMoreLabel,
  sortCards,
  shouldActivateOnSave,
  suggestedRuleId,
  TILE_ABSENT_BASIS,
  TILE_UNKNOWN,
  tileBasis,
  tileFigure,
  tileMoney,
  whyNowLines,
  whyThisFitsLine,
  windowLabel,
  type CardLike,
  type PerkRecommendationLike,
  type PostureHealth
} from './recommendationCards';

/**
 * `health(over)` mirrors the wire shape exactly, and `over` is spread at the
 * TOP LEVEL — so passing `inputs: {...}` REPLACES the whole `inputs` object
 * rather than merging into it. That is deliberate: it is how the "a missing
 * runway is omitted" test below produces an `inputs` with no `runway_days`
 * key at all, rather than one explicitly set to undefined.
 */
const health = (over: Partial<PostureHealth> = {}): PostureHealth => ({
  score: 74,
  tier: 'green',
  mode: 'growth',
  provisional: false,
  components: {},
  inputs: { trajectory_yoy: 0.09, runway_days: 210, repeat_share: 0.31 },
  projection: { label: 'grow', net_12: '1.00', cash_end: '1.00', cash_estimated: false },
  reasons: [],
  as_of: '2026-09-18',
  ...over
});

describe('buildPostureLine', () => {
  it('growth', () => {
    const line = buildPostureLine(health());
    expect(line.chip).toBe('Growth mode');
    expect(line.tone).toBe('success');
    expect(line.text).toBe(
      'Revenue is up 9% on last year, you have about 210 days of cash, and 31% of active customers came back this year. Suggestions below lean into that.'
    );
  });

  it('save', () => {
    const line = buildPostureLine(health({ tier: 'red', mode: 'save', inputs: { trajectory_yoy: -0.06, runway_days: 38 } }));
    expect(line.chip).toBe('Save mode');
    expect(line.tone).toBe('error');
    expect(line.text).toContain('down 6%');
    expect(line.text).toContain('38 days');
    expect(line.text).toContain('without spending cash up front');
  });

  it('save — the exact sentence, not merely a superstring match', () => {
    // The `toContain` checks above are the brief's; this pins the whole
    // sentence so the parts-join arithmetic (comma vs "and", no trailing
    // Oxford comma at two items) cannot silently drift.
    const line = buildPostureLine(health({ tier: 'red', mode: 'save', inputs: { trajectory_yoy: -0.06, runway_days: 38 } }));
    expect(line.text).toBe(
      'Revenue is down 6% on last year and you have about 38 days of cash. Suggestions below protect cash and bring members back without spending cash up front.'
    );
  });

  it('zero trajectory reads as flat, not "up 0%" or "down 0%"', () => {
    const line = buildPostureLine(health({ inputs: { trajectory_yoy: 0, runway_days: 90 } }));
    expect(line.text).toContain('Revenue is flat on last year');
  });

  it('provisional says how many signals and what is missing', () => {
    const line = buildPostureLine(
      health({
        provisional: true,
        components: { trajectory: 60, customer_engine: 50 },
        reasons: ['expenses_unobserved', 'inventory_unavailable']
      })
    );
    expect(line.caveat).toBe('based on 2 of 5 signals');
    expect(line.missing).toBe('Missing: expenses not observed, inventory ledger unavailable');
    expect(line.note).toBeUndefined();
  });

  it('a CAP is not a missing signal — the two classes are reported separately', () => {
    // The commonest merchant in the product: a shop in its first year with
    // otherwise complete data. All five components are measured, so there is
    // NO "n of 5" caveat — but trajectory is floored at 70, which is a note.
    // The old shape rendered "based on 5 of 5 signals" beside "Missing: under
    // 13 months of history", two sentences denying each other.
    const line = buildPostureLine(
      health({
        provisional: true,
        components: { trajectory: 70, profitability: 60, runway: 40, customer_engine: 55, inventory: 50 },
        reasons: ['trajectory_provisional_under_13_months']
      })
    );
    expect(line.caveat).toBeUndefined();
    expect(line.missing).toBeUndefined();
    expect(line.note).toBe('Note: under 13 months of history');
  });

  it('reports gaps and caps at once, each under its own header', () => {
    const line = buildPostureLine(
      health({
        provisional: true,
        components: { trajectory: 70, customer_engine: 55 },
        reasons: ['expenses_unobserved', 'green_capped_no_profitability']
      })
    );
    // Asserted as two classes, never as one concatenated sentence.
    expect(line.caveat).toBe('based on 2 of 5 signals');
    expect(line.missing).toBe('Missing: expenses not observed');
    expect(line.note).toBe('Note: score capped while profitability is unobserved');
  });

  it('omits an empty group rather than printing a bare header', () => {
    const gapsOnly = buildPostureLine(health({ provisional: true, components: { trajectory: 60 }, reasons: ['expenses_unobserved'] }));
    expect(gapsOnly.caveatTooltip).not.toMatch(/Note:/);
    const capsOnly = buildPostureLine(
      health({ provisional: true, components: { trajectory: 60 }, reasons: ['trajectory_provisional_under_13_months'] })
    );
    expect(capsOnly.caveatTooltip).not.toMatch(/Missing:/);
  });

  it('no copy string contains a comma, because they are joined into comma lists', () => {
    // `'profitability not observed, so not green'` rendered as TWO list items,
    // one of which was "so not green".
    Object.values(REASON_COPY).forEach((copy) => expect(copy).not.toMatch(/,/));
  });

  it('covers all seven backend reasons, split into the five gaps and the two caps', () => {
    const line = buildPostureLine(
      health({
        provisional: true,
        components: { trajectory: 60 },
        reasons: [
          'expenses_unobserved',
          'inventory_unavailable',
          'customer_engine_unavailable',
          'trajectory_provisional_under_13_months',
          'no_prior_revenue',
          'green_capped_no_profitability',
          'profitability_unavailable'
        ]
      })
    );
    expect(line.missing).toBe(
      'Missing: expenses not observed, inventory ledger unavailable, customer history too thin, no prior-year revenue, profitability not observed'
    );
    expect(line.note).toBe('Note: under 13 months of history, score capped while profitability is unobserved');
    expect(GAP_REASONS).toHaveLength(5);
    expect(CAP_REASONS).toHaveLength(2);
  });

  it('an unrecognised reason is humanised, never dropped, and counted as a GAP', () => {
    // Of the two wrong answers this is the safer: calling a new cap a gap
    // over-reports what is missing; calling a new gap a cap under-reports it,
    // which is the one thing this tooltip exists to prevent.
    expect(reasonCopy('some_new_reason')).toBe('some new reason');
    const line = buildPostureLine(health({ provisional: true, components: { trajectory: 60 }, reasons: ['some_new_reason'] }));
    expect(line.missing).toBe('Missing: some new reason');
    expect(line.note).toBeUndefined();
  });

  it('a REAL runway of 0 is printed — only a missing one is omitted', () => {
    // The save rig genuinely reads 0 here, and "about 0 days of cash" is the
    // most important sentence this line can print. The omission rule is a
    // `typeof === "number"` check precisely so that a true zero survives it;
    // a truthiness guard would silently delete the emergency.
    const line = buildPostureLine(health({ tier: 'red', mode: 'save', inputs: { trajectory_yoy: -0.4, runway_days: 0 } }));
    expect(line.text).toContain('you have about 0 days of cash');
  });

  it('a missing runway is omitted, not printed as 0 days', () => {
    const line = buildPostureLine(health({ inputs: { trajectory_yoy: 0.02 } }));
    expect(line.text).not.toMatch(/\d+ days/);
  });

  it('a missing trajectory or repeat share is omitted the same way', () => {
    const line = buildPostureLine(health({ inputs: { runway_days: 45 } }));
    expect(line.text).not.toMatch(/on last year/);
    expect(line.text).not.toMatch(/came back this year/);
    expect(line.text).toContain('45 days of cash');
  });

  it('no score at all', () => {
    expect(buildPostureLine(health({ score: null, tier: null, mode: null })).chip).toBe('Not enough data yet');
    expect(buildPostureLine(health({ score: null, tier: null, mode: null })).tone).toBe('neutral');
  });

  it('a yellow tier in growth mode keeps the growth chip but warns', () => {
    const line = buildPostureLine(health({ tier: 'yellow', mode: 'growth' }));
    expect(line.chip).toBe('Growth mode');
    expect(line.tone).toBe('warning');
  });

  it('the TONE is the tier and the TEXT is the mode, for save as much as for growth', () => {
    // Design §3.1: "The chip colour is the tier (red / yellow / green)."
    // Deriving it from the mode painted a yellow-tier shop in save mode red —
    // and the colour is the only tier signal anywhere on this line.
    const yellowSave = buildPostureLine(health({ tier: 'yellow', mode: 'save' }));
    expect(yellowSave.chip).toBe('Save mode');
    expect(yellowSave.tone).toBe('warning');

    const greenSave = buildPostureLine(health({ tier: 'green', mode: 'save' }));
    expect(greenSave.tone).toBe('success');

    const redGrowth = buildPostureLine(health({ tier: 'red', mode: 'growth' }));
    expect(redGrowth.chip).toBe('Growth mode');
    expect(redGrowth.tone).toBe('error');
  });

  it('not provisional carries no caveat', () => {
    const line = buildPostureLine(health({ provisional: false }));
    expect(line.caveat).toBeUndefined();
    expect(line.caveatTooltip).toBeUndefined();
  });
});

describe('cards', () => {
  const card = (over: Partial<CardLike> = {}): CardLike => ({
    id: 'x',
    kind: 'event',
    cases: {
      downside: { amount: '1100.00', assumption: 'if 3 of 14 come' },
      base: { amount: '2900.00', assumption: 'if 6 of 14 come' },
      upside: { amount: '5200.00', assumption: 'if 9 come and bring one guest each' }
    },
    cost: { amount: null, label: 'drinks and staffing', owner_input: true },
    expected_health_delta: 1,
    confidence: 'high',
    expected_value_dollars: '2900.00',
    ...over
  });

  it('sorts by base desc then confidence', () => {
    expect(
      sortCards([card({ id: 'a', expected_value_dollars: '100.00' }), card({ id: 'b' }), card({ id: 'c', confidence: 'low' })]).map(
        (c) => c.id
      )
    ).toEqual(['b', 'c', 'a']);
  });

  it('ties on both value and confidence break by id ascending, stably', () => {
    const input = [card({ id: 'z' }), card({ id: 'a' }), card({ id: 'm' })];
    expect(sortCards(input).map((c) => c.id)).toEqual(['a', 'm', 'z']);
  });

  it('does not mutate the array it is given', () => {
    const input = [card({ id: 'b' }), card({ id: 'a', expected_value_dollars: '1.00' })];
    const before = input.map((c) => c.id);
    sortCards(input);
    expect(input.map((c) => c.id)).toEqual(before);
  });

  it('falls back to the base case amount when expected_value_dollars is absent', () => {
    expect(
      sortCards([
        card({
          id: 'lo',
          expected_value_dollars: null,
          cases: {
            downside: { amount: '0', assumption: '' },
            base: { amount: '10.00', assumption: '' },
            upside: { amount: '0', assumption: '' }
          }
        }),
        card({
          id: 'hi',
          expected_value_dollars: null,
          cases: {
            downside: { amount: '0', assumption: '' },
            base: { amount: '999.00', assumption: '' },
            upside: { amount: '0', assumption: '' }
          }
        })
      ]).map((c) => c.id)
    ).toEqual(['hi', 'lo']);
  });

  it('case rows format money and keep the sentence verbatim', () => {
    expect(caseRows(card())).toEqual([
      { label: 'Downside', amount: '+$1,100', assumption: 'if 3 of 14 come' },
      { label: 'Base', amount: '+$2,900', assumption: 'if 6 of 14 come' },
      { label: 'Upside', amount: '+$5,200', assumption: 'if 9 come and bring one guest each' }
    ]);
  });

  it('cost row: owner input, an amount, or nothing', () => {
    expect(costRow(card())).toEqual({ label: 'Cost', amount: 'your input', assumption: 'drinks and staffing' });
    expect(costRow(card({ cost: { amount: '60.00', label: '10% off, paid only when a code is redeemed', owner_input: false } }))).toEqual({
      label: 'Cost',
      amount: '~$60',
      assumption: '10% off, paid only when a code is redeemed'
    });
    expect(costRow(card({ cost: null }))).toBeNull();
  });

  it('health row hidden when null', () => {
    expect(healthRow(card())).toEqual({ label: 'Health', amount: '+1 point', assumption: 'at the base case' });
    expect(healthRow(card({ expected_health_delta: null }))).toBeNull();
    expect(healthRow(card({ expected_health_delta: -3 }))?.amount).toBe('−3 points');
  });

  it('kind labels are the Outreach vocabulary', () => {
    expect(cardKindLabel('event')).toBe('Invite to an event or perk');
    expect(cardKindLabel('perk-settings')).toBe('Adjust a network perk');
  });

  it('empty copy is the agreed sentence', () => {
    expect(EMPTY_COPY).toBe("Nothing worth suggesting this week. Your members look steady; we'll check again tonight.");
  });
});

describe('formatMoney — the guarded currency formatter', () => {
  it('formats a normal currency with thousands separators, no decimals', () => {
    expect(formatMoney(1100, 'USD')).toBe('$1,100');
  });

  it('never throws on an unrecognised currency code, and RETRIES IN USD rather than degrading the number', () => {
    // 'XXXX' is not a valid ISO 4217 code — Intl.NumberFormat throws a
    // RangeError constructing the formatter. The guard must swallow it,
    // exactly as inventoryKpis.ts's excludedStockAtRetail does, rather than
    // letting a bad currency blank the whole card in render.
    //
    // And it must keep the THOUSANDS SEPARATOR while it does. A settings typo
    // in a currency code is no reason to show the owner '$52000': the grouping
    // is the thing that makes a five-figure sum readable at a glance, and
    // dropping it damages the number in the one dimension that matters to fix
    // a symbol nobody was reading.
    expect(() => formatMoney(1100, 'XXXX')).not.toThrow();
    expect(formatMoney(1100, 'XXXX')).toBe('$1,100');
    expect(formatMoney(52000, 'not-a-code')).toBe('$52,000');
  });

  it('a bad currency survives the signed path too — the card renders +$52,000, not +$52000', () => {
    // formatMoney is reached through formatSignedMoney on every case row, so
    // this is the form the owner actually sees on a card.
    const rows = caseRows(
      {
        id: 'x',
        kind: 'event',
        cases: {
          downside: { amount: '52000', assumption: 'a' },
          base: { amount: '52000', assumption: 'b' },
          upside: { amount: '52000', assumption: 'c' }
        },
        cost: null,
        expected_health_delta: null,
        confidence: 'high'
      },
      'not-a-code'
    );
    expect(rows[1].amount).toBe('+$52,000');
  });
});

describe('innerCircleHandoffLabel — the Dashboard pointer', () => {
  it('is singular at exactly one', () => {
    expect(innerCircleHandoffLabel(1)).toBe('1 Inner Circle suggestion');
  });

  it('is plural at every other count the row can render', () => {
    expect(innerCircleHandoffLabel(2)).toBe('2 Inner Circle suggestions');
    expect(innerCircleHandoffLabel(14)).toBe('14 Inner Circle suggestions');
  });

  it('pluralises zero, which the caller never renders — the rule, not the caller, is what is pinned here', () => {
    // The Dashboard hides the row below 1, so this case is unreachable today.
    // It is asserted anyway: "0 Inner Circle suggestion" is what a naive
    // `n === 1 ? … : …` inversion would produce, and a test that only ever
    // sees 1 and 2 cannot tell the two implementations apart.
    expect(innerCircleHandoffLabel(0)).toBe('0 Inner Circle suggestions');
  });
});

describe('card presentation helpers', () => {
  it('the intent chip says Growth and Save, not the wire words', () => {
    expect(intentChipLabel('growth')).toBe('Growth');
    expect(intentChipLabel('save')).toBe('Save');
  });

  it('the confidence caption reads as a phrase', () => {
    expect(confidenceLabel('high')).toBe('high confidence');
    expect(confidenceLabel('low')).toBe('low confidence');
  });

  it('maps the posture tone onto a MUI chip colour, and neutral is default', () => {
    // MUI's Chip has no `neutral`; passing one renders the chip unstyled and
    // logs nothing, which is exactly the kind of failure a gate cannot see.
    expect(postureChipColor('neutral')).toBe('default');
    expect(postureChipColor('success')).toBe('success');
    expect(postureChipColor('warning')).toBe('warning');
    expect(postureChipColor('error')).toBe('error');
  });

  it('the rationale line renders the stored reason and names NO mode', () => {
    // `posture_reason` is frozen by the recommender; `health.mode` is
    // recomputed on every GET, and cards live 14 days. Gluing the live mode
    // onto the frozen sentence let the heading name SAVE over a sentence
    // reading "cash covers ~210 days, so an evening that costs money now is a
    // bet you can afford" — the label denying the figures beneath it.
    expect(whyThisFitsLine('cash covers ~210 days, so an evening you pay for now is a bet you can afford.')).toBe(
      'Why this fits — cash covers ~210 days, so an evening you pay for now is a bet you can afford.'
    );
    expect(whyThisFitsLine('a code costs nothing until it is redeemed.')).toBe(
      'Why this fits — a code costs nothing until it is redeemed.'
    );
  });

  it('the rationale line names no mode in any wording, so it cannot contradict the posture line', () => {
    const line = whyThisFitsLine('cash covers ~210 days.') ?? '';
    expect(line).not.toMatch(/Growth mode|Save mode|Because you/);
  });

  it('the rationale line is null with no reason, never a bare heading', () => {
    expect(whyThisFitsLine('')).toBeNull();
    expect(whyThisFitsLine('   ')).toBeNull();
    expect(whyThisFitsLine(null)).toBeNull();
    expect(whyThisFitsLine(undefined)).toBeNull();
  });

  it('audience is stated as a group, never as a delivery count', () => {
    expect(audienceContextLine(14)).toBe('14 members in this group');
    expect(audienceContextLine(1)).toBe('1 member in this group');
  });

  it('an empty or absent audience says nothing rather than "0 members in this group"', () => {
    expect(audienceContextLine(0)).toBeNull();
    expect(audienceContextLine(null)).toBeNull();
    expect(audienceContextLine(undefined)).toBeNull();
    expect(audienceContextLine(Number.NaN)).toBeNull();
  });

  it('the window label pluralises and disappears when there is no window', () => {
    expect(windowLabel(30)).toBe('over 30 days');
    expect(windowLabel(1)).toBe('over 1 day');
    // "over 0 days" would head a table of figures with a window that cannot
    // contain them.
    expect(windowLabel(0)).toBeNull();
    expect(windowLabel(null)).toBeNull();
    expect(windowLabel(undefined)).toBeNull();
  });
});

describe('showMoreLabel — the fold', () => {
  it('counts what is hidden, not the page size', () => {
    expect(showMoreLabel(8, 5)).toBe('Show 3 more');
    expect(showMoreLabel(6, 5)).toBe('Show 1 more');
  });

  it('disappears once everything is shown — the button is its own end state', () => {
    // Arithmetic that assumed five would keep offering to reveal cards that
    // are already on screen, which is what "Show 3 more" means after the
    // owner has already pressed it once.
    expect(showMoreLabel(8, 8)).toBeNull();
    expect(showMoreLabel(5, 5)).toBeNull();
    expect(showMoreLabel(3, 5)).toBeNull();
    expect(showMoreLabel(0, 5)).toBeNull();
  });
});

describe('adaptPerkRecommendation — the one card the recommendations endpoint does not send', () => {
  const perk = (over: Partial<PerkRecommendationLike> = {}): PerkRecommendationLike => ({
    id: 42,
    confidence: 'high',
    narrative:
      'Raise your Gold welcome perk to 12%. Visiting Gold members from other stores convert at twice the rate when the welcome clears 10%.',
    accepted_at: null,
    dismissed_at: null,
    ...over
  });

  it('becomes a card whose kind, actions and destination are the settings section', () => {
    const card = adaptPerkRecommendation(perk());
    expect(card?.kind).toBe('perk-settings');
    expect(card?.actions).toEqual({ type: 'perk-settings', perkRecommendationId: 42, href: PERK_SETTINGS_HREF });
    expect(PERK_SETTINGS_HREF).toBe('/inner-circle?tab=settings&section=tiers');
  });

  it('splits the narrative into a title and a body rather than using it whole as a title', () => {
    const card = adaptPerkRecommendation(perk());
    expect(card?.title).toBe('Raise your Gold welcome perk to 12%.');
    expect(card?.body).toContain('convert at twice the rate');
  });

  it('falls back to a fixed title when there is no narrative at all', () => {
    expect(adaptPerkRecommendation(perk({ narrative: null }))?.title).toBe(PERK_SETTINGS_FALLBACK_TITLE);
    expect(adaptPerkRecommendation(perk({ narrative: '' }))?.title).toBe(PERK_SETTINGS_FALLBACK_TITLE);
  });

  it('carries no dollars at all — null, never zero', () => {
    const card = adaptPerkRecommendation(perk());
    expect(card?.cases).toBeNull();
    expect(card?.cost).toBeNull();
    expect(card?.expected_health_delta).toBeNull();
    expect(card?.expected_value_dollars).toBeNull();
    // And therefore renders no case table and no cost row.
    expect(caseRows(card!)).toEqual([]);
    expect(costRow(card!)).toBeNull();
    expect(healthRow(card!)).toBeNull();
  });

  it('claims no posture, so the card prints no rationale line', () => {
    // It is not generated from health, so it has no stored reason to show.
    const card = adaptPerkRecommendation(perk());
    expect(whyThisFitsLine(card!.posture_reason)).toBeNull();
  });

  it('is null for nothing, for an accepted one and for a dismissed one', () => {
    expect(adaptPerkRecommendation(null)).toBeNull();
    expect(adaptPerkRecommendation(undefined)).toBeNull();
    expect(adaptPerkRecommendation(perk({ accepted_at: '2026-09-01T00:00:00Z' }))).toBeNull();
    expect(adaptPerkRecommendation(perk({ dismissed_at: '2026-09-01T00:00:00Z' }))).toBeNull();
  });

  it('validates confidence against the three values instead of casting it', () => {
    expect(adaptPerkRecommendation(perk({ confidence: 'low' }))?.confidence).toBe('low');
    // An unrecognised value reaching CONFIDENCE_RANK as undefined would turn
    // every comparison in sortCards into NaN and scramble the whole list.
    expect(adaptPerkRecommendation(perk({ confidence: 'extremely' }))?.confidence).toBe('medium');
    expect(adaptPerkRecommendation(perk({ confidence: '' }))?.confidence).toBe('medium');
  });

  it('sorts below every priced card without ever printing a price', () => {
    const card = adaptPerkRecommendation(perk())!;
    const priced: CardLike = {
      id: 'rec-1',
      kind: 'discount',
      cases: null,
      cost: null,
      expected_health_delta: null,
      confidence: 'low',
      expected_value_dollars: '10.00'
    };
    expect(sortCards([card, priced]).map((c) => c.id)).toEqual(['rec-1', 'perk-settings-42']);
  });

  it('has an id that cannot collide with an outreach card uuid', () => {
    expect(adaptPerkRecommendation(perk())?.id).toBe('perk-settings-42');
  });

  it('is narrowed by kind, which is what the card component branches on', () => {
    const card = adaptPerkRecommendation(perk())!;
    expect(isPerkSettingsCard(card)).toBe(true);
    expect(isPerkSettingsCard({ kind: 'discount' })).toBe(false);
  });
});

describe('refreshErrorMessage — a throttle is not a fault', () => {
  it('reads a 429 as "come back in a bit"', () => {
    // The generate endpoint is throttled 6/hour per role. Reporting that as a
    // failure sends the owner looking for a problem that is a rate limit
    // doing its job.
    expect(refreshErrorMessage({ response: { status: 429 } })).toBe(REFRESH_THROTTLED_MESSAGE);
  });

  it('reads everything else as a genuine failure', () => {
    expect(refreshErrorMessage({ response: { status: 500 } })).toBe(REFRESH_FAILED_MESSAGE);
    expect(refreshErrorMessage(new Error('network'))).toBe(REFRESH_FAILED_MESSAGE);
    expect(refreshErrorMessage(null)).toBe(REFRESH_FAILED_MESSAGE);
    expect(refreshErrorMessage(undefined)).toBe(REFRESH_FAILED_MESSAGE);
  });
});

describe('adaptOutreachCards — the kinds that have a composer behind them', () => {
  // Cast, and deliberately so: the point of this filter is the kind the WIRE
  // can carry but the type says it cannot, which is unexpressible without one.
  const wire = (kind: string, id: string) => ({ id, kind }) as unknown as OutreachRecommendation;

  it('keeps the three real kinds', () => {
    const kept = adaptOutreachCards([wire('discount', 'a'), wire('event', 'b'), wire('vote', 'c')]);
    expect(kept.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('drops a kind with no dialog behind it, rather than rendering a Set it up that opens nothing', () => {
    // `kind_wire` is None for a malformed row upstream, so the union is an
    // assertion about the backend rather than a guarantee from it.
    const kept = adaptOutreachCards([wire('discount', 'a'), wire('survey', 'b'), wire('', 'c')]);
    expect(kept.map((c) => c.id)).toEqual(['a']);
  });

  it('a null or non-array payload is an empty list, never a crash in render', () => {
    expect(adaptOutreachCards(null)).toEqual([]);
    expect(adaptOutreachCards(undefined)).toEqual([]);
  });
});

describe('the tiles — a failed fetch is never a confident zero (ALL-103)', () => {
  it('shows the figure when it is real, including a genuine zero', () => {
    expect(tileFigure(14)).toBe(14);
    expect(tileFigure(0)).toBe(0);
  });

  it('shows an em dash when the request failed, when the field is absent, and when it is not a number', () => {
    expect(tileFigure(14, true)).toBe(TILE_UNKNOWN);
    expect(tileFigure(undefined)).toBe(TILE_UNKNOWN);
    expect(tileFigure(null)).toBe(TILE_UNKNOWN);
    expect(tileFigure(Number.NaN)).toBe(TILE_UNKNOWN);
  });

  it('formats money from the wire’s decimal strings', () => {
    expect(tileMoney('975996.21')).toBe('$975,996');
    expect(tileMoney(0)).toBe('$0');
  });

  it('never prints $0 for a field that arrived empty or failed', () => {
    // `Number("")` is 0, so a `?? 0` guard here would report a boutique with
    // no lifetime value at all rather than a field that did not arrive.
    expect(tileMoney('')).toBe(TILE_UNKNOWN);
    expect(tileMoney(undefined)).toBe(TILE_UNKNOWN);
    expect(tileMoney(null)).toBe(TILE_UNKNOWN);
    expect(tileMoney('9999', true)).toBe(TILE_UNKNOWN);
    expect(tileMoney('not money')).toBe(TILE_UNKNOWN);
  });
});

describe('buildPostureLine — fix round 1: no figures, and the capital letter', () => {
  it('capitalises the assembled sentence when the FIRST clause is not the trajectory one', () => {
    // The save rig renders exactly this: no trajectory figure, a runway of 0.
    // Every clause is written to sit mid-sentence, so whichever one ends up
    // first has to be capitalised by the joiner rather than by its builder.
    const line = buildPostureLine(health({ tier: 'red', mode: 'save', inputs: { runway_days: 0 } }));
    expect(line.text.startsWith('You have about 0 days of cash')).toBe(true);
    expect(line.text).not.toMatch(/^[a-z]/);
  });

  it('keeps the later clauses lowercase — only the first character changes', () => {
    const line = buildPostureLine(health());
    expect(line.text).toBe(
      'Revenue is up 9% on last year, you have about 210 days of cash, and 31% of active customers came back this year. Suggestions below lean into that.'
    );
  });

  it('says the figures are missing rather than leaving "lean into that" with no "that"', () => {
    // `inputs: {}` — a real shape: the mode comes from the score, which can be
    // computed from components the posture sentence does not print.
    const line = buildPostureLine(health({ mode: 'growth', inputs: {} }));
    expect(line.text).toBe('No trend figures yet — suggestions below lean into growth.');
    expect(line.chip).toBe('Growth mode');
  });

  it('does the same in save mode, without the dangling anaphor', () => {
    const line = buildPostureLine(health({ tier: 'red', mode: 'save', inputs: {} }));
    expect(line.text).toBe('No trend figures yet — suggestions below protect cash and bring members back without spending cash up front.');
  });

  it('with no mode AND no figures there is nothing to say, so it says nothing', () => {
    const line = buildPostureLine(health({ score: null, tier: null, mode: null, inputs: {} }));
    expect(line.text).toBe('');
    expect(line.chip).toBe('Not enough data yet');
  });
});

describe('suggestedRuleId — the rule the recommender already created', () => {
  const card = (kind: 'discount' | 'event' | 'vote' | 'perk-settings', prefill: Record<string, unknown> | null) => ({ kind, prefill });

  it('finds the id on a discount card', () => {
    expect(suggestedRuleId(card('discount', { promotion_rule_id: 'rule-1', discount_pct: 15 }))).toBe('rule-1');
  });

  it('is null for the kinds whose recommenders pre-create nothing', () => {
    // Passing an event card's id through would open a PERK dialog against a
    // promotion rule, which is a different mistake with the same cause.
    expect(suggestedRuleId(card('event', { promotion_rule_id: 'rule-1' }))).toBeNull();
    expect(suggestedRuleId(card('vote', { promotion_rule_id: 'rule-1' }))).toBeNull();
    expect(suggestedRuleId(card('perk-settings', { promotion_rule_id: 'rule-1' }))).toBeNull();
  });

  it('is null when there is no id, and never coerces a non-string into one', () => {
    // `String(undefined)` is "undefined", which would resolve to nothing while
    // looking exactly like an id — `suggestedPromotionIds`' own rule.
    expect(suggestedRuleId(card('discount', null))).toBeNull();
    expect(suggestedRuleId(card('discount', {}))).toBeNull();
    expect(suggestedRuleId(card('discount', { promotion_rule_id: '' }))).toBeNull();
    expect(suggestedRuleId(card('discount', { promotion_rule_id: 42 }))).toBeNull();
    expect(suggestedRuleId(card('discount', { promotion_rule_id: null }))).toBeNull();
  });

  it('the fallback notice says a new rule is being created, not that an edit failed', () => {
    expect(RULE_REMOVED_NOTICE).toBe('The suggested rule was removed; this creates a new one.');
  });
});

describe('whyNowLines', () => {
  it('puts the audience line last, after the backend reasons', () => {
    expect(whyNowLines(['3 POs land between Oct 2 and Oct 9', 'Vault spent $9,880'], 14)).toEqual([
      '3 POs land between Oct 2 and Oct 9',
      'Vault spent $9,880',
      '14 members in this group'
    ]);
  });

  it('drops blank reasons rather than rendering empty bullets', () => {
    expect(whyNowLines(['real', '', '   '], null)).toEqual(['real']);
  });

  it('is empty when there is nothing to say, so the heading can disappear with it', () => {
    expect(whyNowLines([], null)).toEqual([]);
    expect(whyNowLines([], 0)).toEqual([]);
    expect(whyNowLines(null, null)).toEqual([]);
    expect(whyNowLines(undefined, undefined)).toEqual([]);
  });

  it('renders an audience-only list when the backend sent no reasons', () => {
    expect(whyNowLines([], 14)).toEqual(['14 members in this group']);
  });
});

describe('droppedCardsMessage — cards the client could not render', () => {
  it('counts what was dropped and pluralises it', () => {
    expect(droppedCardsMessage(3, 1)).toBe('2 suggestions could not be shown (unknown kind)');
    expect(droppedCardsMessage(2, 1)).toBe('1 suggestion could not be shown (unknown kind)');
  });

  it('is null when nothing was dropped, which is every ordinary week', () => {
    expect(droppedCardsMessage(3, 3)).toBeNull();
    expect(droppedCardsMessage(0, 0)).toBeNull();
  });

  it('speaks when EVERY card was dropped — the case that would otherwise read as an empty week', () => {
    // The fetch succeeded and returned two suggestions. "Nothing worth
    // suggesting this week" would be a verdict on the owner's week that the
    // backend never delivered.
    expect(droppedCardsMessage(2, 0)).toBe('2 suggestions could not be shown (unknown kind)');
  });
});

describe('tileBasis — why a tile shows nothing', () => {
  it('says nothing for a real figure', () => {
    expect(tileBasis(14)).toBeUndefined();
    expect(tileBasis(0)).toBeUndefined();
  });

  it('names the absent field when the backend simply does not send it', () => {
    expect(tileBasis(undefined)).toBe(TILE_ABSENT_BASIS);
    expect(tileBasis(null)).toBe(TILE_ABSENT_BASIS);
  });

  it('stays silent when the cause is a failure, which the Retry control already names', () => {
    // "not reported by this backend" beside a network blip sends the owner
    // looking at the wrong thing entirely.
    expect(tileBasis(undefined, true)).toBeUndefined();
    expect(tileBasis(14, true)).toBeUndefined();
  });
});

describe('composerSnapshot — frozen at the click, not read live off the cache', () => {
  const card = { id: 'rec-1', kind: 'discount' as const, prefill: { promotion_rule_id: 'p1', discount_pct: 15 } };

  it('carries the kind, the prefill and the recommendation id', () => {
    expect(composerSnapshot(card)).toEqual({
      kind: 'discount',
      prefill: { promotion_rule_id: 'p1', discount_pct: 15 },
      recommendationId: 'rec-1'
    });
  });

  it('is a COPY — the snapshot does not alias the card it came from', () => {
    // The identity is the whole point. A React Query refetch replaces the
    // cached row, and a live `card.prefill` then re-memoises the composer's
    // `initialValues`, re-runs the dialog's effect and calls setForm over
    // whatever the owner was typing.
    const snapshot = composerSnapshot(card);
    expect(snapshot.prefill).not.toBe(card.prefill);
    expect(snapshot.prefill).toEqual(card.prefill);
  });

  it('is unaffected by a later change to the source object', () => {
    const source = { id: 'rec-1', kind: 'discount' as const, prefill: { discount_pct: 15 } };
    const snapshot = composerSnapshot(source);
    source.prefill.discount_pct = 99;
    expect(snapshot.prefill).toEqual({ discount_pct: 15 });
  });

  it('keeps a null prefill null rather than inventing an empty object', () => {
    // An empty object is a different instruction to the dialog than "nothing
    // to prefill", and `prefillFor` treats the two differently.
    expect(composerSnapshot({ id: 'r', kind: 'event', prefill: null }).prefill).toBeNull();
    expect(composerSnapshot({ id: 'r', kind: 'event' }).prefill).toBeNull();
  });
});

describe('hasCases / hasCost — the wire sends {} and never null', () => {
  const bare = (over: Partial<CardLike>): CardLike => ({
    id: 'x',
    kind: 'vote',
    cases: null,
    cost: null,
    expected_health_delta: null,
    confidence: 'low',
    ...over
  });

  it('accepts a full set of three scenarios', () => {
    const card = bare({
      cases: {
        downside: { amount: '1.00', assumption: 'a' },
        base: { amount: '2.00', assumption: 'b' },
        upside: { amount: '3.00', assumption: 'c' }
      }
    });
    expect(hasCases(card)).toBe(true);
    expect(caseRows(card)).toHaveLength(3);
  });

  it('treats the literal {} as absent, and does NOT crash destructuring it', () => {
    // `outreach_cards.py` writes `… or {}`, so the absent shape is truthy.
    // A `if (!card.cases)` guard was dead code, and `const { base } = {}` then
    // reached `base.amount` — a TypeError that takes the whole This-week
    // render down rather than dropping one row.
    const card = bare({ cases: {} });
    expect(hasCases(card)).toBe(false);
    expect(() => caseRows(card)).not.toThrow();
    expect(caseRows(card)).toEqual([]);
  });

  it('treats a half-built case map as absent rather than rendering half a table', () => {
    const card = bare({ cases: { base: { amount: '2.00', assumption: 'b' } } as never });
    expect(hasCases(card)).toBe(false);
    expect(caseRows(card)).toEqual([]);
  });

  it('a {} cost renders no row instead of "~$NaN · undefined"', () => {
    const card = bare({ cost: {} });
    expect(hasCost(card)).toBe(false);
    expect(costRow(card)).toBeNull();
  });

  it('null still works for both, so a backend that starts sending it is fine', () => {
    expect(hasCases(bare({}))).toBe(false);
    expect(hasCost(bare({}))).toBe(false);
  });
});

describe('costRow — four states, and the flag is honoured', () => {
  const withCost = (cost: CardLike['cost']): CardLike => ({
    id: 'x',
    kind: 'discount',
    cases: null,
    cost,
    expected_health_delta: null,
    confidence: 'low'
  });

  it('asks the owner only when the backend says to', () => {
    expect(costRow(withCost({ amount: null, label: 'drinks and staffing', owner_input: true }))?.amount).toBe(COST_OWNER_INPUT);
  });

  it('an exactly-zero cost reads "none", never "~$0"', () => {
    // The vote composer sends {amount: "0.00", owner_input: false}. A tilde
    // means "approximately", on the one figure in the card that is certain.
    const row = costRow(withCost({ amount: '0.00', label: 'nothing — a vote costs no money', owner_input: false }));
    expect(row?.amount).toBe(COST_NONE);
    expect(row?.assumption).toBe('nothing — a vote costs no money');
  });

  it('a null amount with owner_input FALSE reads "not estimated", never "your input"', () => {
    // The curated discount sends {amount: null, owner_input: false} beside
    // "paid only when a code is redeemed" — telling the owner to supply a
    // figure that is contingent by nature, next to a sentence saying so.
    expect(costRow(withCost({ amount: null, label: '15% off, paid only when a code is redeemed', owner_input: false }))?.amount).toBe(
      COST_NOT_ESTIMATED
    );
  });

  it('a real figure is approximate, as it always was', () => {
    expect(costRow(withCost({ amount: '420.00', label: 'venue', owner_input: false }))?.amount).toBe('~$420');
  });

  it('an unparseable amount is not estimated rather than $NaN', () => {
    expect(costRow(withCost({ amount: 'lots', label: 'venue', owner_input: false }))?.amount).toBe(COST_NOT_ESTIMATED);
  });
});

describe('shouldActivateOnSave — the suggested rule has to go live', () => {
  it('is true for a discount accepted from a suggestion', () => {
    expect(shouldActivateOnSave('discount', 'rec-1')).toBe(true);
  });

  it('is FALSE from the Outreach table, where there is no recommendation', () => {
    // Editing a paused rule from the table must not silently restart it.
    expect(shouldActivateOnSave('discount', null)).toBe(false);
    expect(shouldActivateOnSave('discount', undefined)).toBe(false);
    expect(shouldActivateOnSave('discount', '')).toBe(false);
  });

  it('is false for the kinds that have no is_active flag to force', () => {
    expect(shouldActivateOnSave('event', 'rec-1')).toBe(false);
    expect(shouldActivateOnSave('vote', 'rec-1')).toBe(false);
  });
});

describe('nextStepAfterAccept — the step that is left', () => {
  it('an activated discount is already happening', () => {
    expect(nextStepAfterAccept('discount', true)).toBe('Live — codes are on their way to members’ tiles.');
  });

  it('every other path names where to go next', () => {
    expect(nextStepAfterAccept('event', false)).toBe('Saved as a draft — invite members from Outreach.');
    expect(nextStepAfterAccept('vote', false)).toBe('Saved as a draft — open voting from Outreach.');
    expect(nextStepAfterAccept('discount', false)).toBe('Saved as a draft — turn it on from Outreach.');
  });

  it('never claims a draft is live', () => {
    (['event', 'vote'] as const).forEach((kind) => {
      expect(nextStepAfterAccept(kind, true)).not.toMatch(/Live/);
    });
  });
});

describe('refreshOutcomeMessage — the button says what happened', () => {
  it('counts what was written, and pluralises', () => {
    expect(refreshOutcomeMessage({ written: 3, skipped: 1 })).toBe('3 new suggestions added');
    expect(refreshOutcomeMessage({ written: 1 })).toBe('1 new suggestion added');
  });

  it('says so when there was nothing new — the ordinary answer', () => {
    expect(refreshOutcomeMessage({ written: 0, skipped: 4 })).toBe(REFRESH_NOTHING_NEW);
  });

  it('a backend with no counters is "nothing new", not a crash or a fake number', () => {
    expect(refreshOutcomeMessage({})).toBe(REFRESH_NOTHING_NEW);
    expect(refreshOutcomeMessage(null)).toBe(REFRESH_NOTHING_NEW);
    expect(refreshOutcomeMessage(undefined)).toBe(REFRESH_NOTHING_NEW);
    expect(refreshOutcomeMessage({ written: Number.NaN })).toBe(REFRESH_NOTHING_NEW);
  });
});

describe('handoffPlacement — the Dashboard must not contradict itself', () => {
  it('a busy body (generate in flight or failed) over an empty list keeps the row, not the empty copy', () => {
    expect(handoffPlacement(3, true, true)).toBe('row');
    expect(handoffPlacement(3, true, false)).toBe('empty');
    expect(handoffPlacement(0, true, true)).toBe('none');
  });
  it('is a row above a real list', () => {
    expect(handoffPlacement(3, false)).toBe('row');
  });

  it('REPLACES the empty copy when the list is empty', () => {
    // "3 Inner Circle suggestions" above "No recommendation met the bar
    // today" is the panel denying itself in two adjacent lines.
    expect(handoffPlacement(3, true)).toBe('empty');
    expect(DASHBOARD_HANDOFF_EMPTY_COPY).toBe('Nothing new here today — your Inner Circle suggestions are in This week.');
  });

  it('is nowhere when nothing is pending — including when the count is unknown', () => {
    expect(handoffPlacement(0, true)).toBe('none');
    expect(handoffPlacement(0, false)).toBe('none');
    expect(handoffPlacement(Number.NaN, true)).toBe('none');
  });
});

describe('needsRemovedRuleNotice — both routes to a deleted rule', () => {
  it('fires for a discount card with no rule id at all (the curated prefill: {} case)', () => {
    // `outreach_cards.py` sends `prefill: {}` when a curated rule is gone, so
    // there is no id to fetch and the 404 branch never runs. Before this,
    // "Set it up" opened a blank create form on a live-looking card, silently.
    expect(needsRemovedRuleNotice({ kind: 'discount', prefill: {} })).toBe(true);
    expect(needsRemovedRuleNotice({ kind: 'discount', prefill: null })).toBe(true);
  });

  it('does not fire when the rule is named — that card takes the fetch path', () => {
    expect(needsRemovedRuleNotice({ kind: 'discount', prefill: { promotion_rule_id: 'p1' } })).toBe(false);
  });

  it('does not fire for the kinds that pre-create nothing', () => {
    expect(needsRemovedRuleNotice({ kind: 'event', prefill: {} })).toBe(false);
    expect(needsRemovedRuleNotice({ kind: 'vote', prefill: null })).toBe(false);
    expect(needsRemovedRuleNotice({ kind: 'perk-settings', prefill: null })).toBe(false);
  });
});
