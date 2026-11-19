// What each card's primary button does (S5).
//
// One entry per primaryAction.kind. S5 opened every flow the brief named and
// checked what it accepts today (the table is in data-spec.md, "Primary
// actions"). None takes a prefill: the purchase-order editor reads only its
// route param, scheduling and bills read nothing, the Inventory insights page
// and Inner Circle read a `?tab=` and nothing about items, sizes, dates or
// segments. So every kind navigates, and the card's actionPayload is logged,
// not sent.
//
// To wire a prefill, give that kind's flow an `open(payload)` that returns
// true when it took the payload; runPrimaryAction then reports 'prefilled'.
// A kind mapped to null has no flow at all: it shows the "coming soon" toast
// and the card is not marked acted on.
//
// Live cards carry no payload (the API has no action field), so a flow may
// instead declare `prefill` (owner trust T16): when the page supplies a
// PrefillHost and the card has a Recommendation id, the flow asks the action
// route what the card is about and opens the place she acts with the work done.
// purchase_order (a draft order) and markdown (a price review) have one; every
// other kind navigates as before. A flow that is cancelled or fails reports
// 'stopped': the card is not marked acted on and nothing navigates.

import { prefillMarkdown, prefillPurchaseOrder, type PrefillHost, type PrefillResult } from './prefillFlows';
import type { PrimaryActionKind, Recommendation } from './types';
import { recordActed, type RecordStorage } from './visitRecord';

/** `stopped`: a prefill flow began and did not finish (cancelled, or a request failed). */
export type ActionOutcome = 'prefilled' | 'navigated' | 'coming_soon' | 'stopped';

export interface ActionResult {
  kind: PrimaryActionKind;
  outcome: ActionOutcome;
  /** One line on what happened, for the console and the docs. */
  detail: string;
}

export interface ActionFlow {
  /** Where the flow lives today. */
  route: string;
  /** Why it is a plain navigation: what the flow accepts. */
  accepts: string;
  /** Opens the flow with the card's payload; resolves true when the payload was taken. None exists yet. */
  open?: (payload: Record<string, unknown>) => Promise<boolean> | boolean;
  /** Opens the place she acts with the work done, from the action route (owner trust T16). */
  prefill?: (rec: Pick<Recommendation, 'id' | 'recommendationId'>, host: PrefillHost) => Promise<PrefillResult>;
}

export const ACTION_FLOWS: Readonly<Record<PrimaryActionKind, ActionFlow | null>> = {
  purchase_order: {
    route: '/inventory/purchase-orders/new',
    accepts: 'a blank draft; the editor reads only the :purchaseOrderId route param',
    // A card with open reorder suggestions makes draft orders and opens the editor on them (T16).
    prefill: prefillPurchaseOrder
  },
  markdown: {
    route: '/inventory?tab=reports&view=markdown-candidates',
    accepts: 'a tab only; there is no price-change or markdown scheduler',
    // A markdown card opens the price review; Approve sends the prices she typed (T16).
    prefill: prefillMarkdown
  },
  shift: {
    route: '/scheduling',
    accepts: 'the route only; tabs are local state and the template builder edits a weekly template, not a dated shift'
  },
  invite: {
    route: '/inner-circle?tab=outreach',
    accepts: '?tab and ?kind; the composer opens from local state and has no segment or audience field'
  },
  payment: {
    route: '/expense/bills',
    accepts: 'the route only; a read-only QuickBooks bill table with no reschedule'
  }
};

export const COMING_SOON_MESSAGE = 'This action is coming soon';

export interface ActionDeps {
  /** react-router's navigate. */
  navigate: (to: string) => void;
  /** Shows a short toast. */
  notify: (message: string) => void;
  /**
   * Supplied by a page that can show the prefill flows' screens (the Insights page). Without it every card
   * navigates, as before.
   */
  prefillHost?: PrefillHost;
}

const prefix = '[insights-redesign]';

export async function runPrimaryAction(
  rec: Pick<Recommendation, 'id' | 'recommendationId' | 'primaryAction' | 'actionPayload'>,
  deps: ActionDeps,
  flows: Readonly<Record<PrimaryActionKind, ActionFlow | null>> = ACTION_FLOWS
): Promise<ActionResult> {
  const { kind } = rec.primaryAction;
  const flow = flows[kind];

  if (!flow) {
    deps.notify(COMING_SOON_MESSAGE);
    const result: ActionResult = { kind, outcome: 'coming_soon', detail: `no ${kind} flow exists` };
    console.info(`${prefix} runPrimaryAction(${rec.id}): ${result.detail}`);
    return result;
  }

  if (flow.prefill && deps.prefillHost && rec.recommendationId) {
    let answer: PrefillResult;
    try {
      answer = await flow.prefill(rec, deps.prefillHost);
    } catch (error) {
      console.warn(`${prefix} prefill for ${rec.id} failed`, error);
      deps.notify('Something went wrong. Nothing was changed.');
      answer = 'stopped';
    }
    if (answer === 'done') {
      const result: ActionResult = { kind, outcome: 'prefilled', detail: `opened the ${kind} flow with the work done` };
      console.info(`${prefix} runPrimaryAction(${rec.id}): ${result.detail}`);
      return result;
    }
    if (answer === 'stopped') {
      const result: ActionResult = { kind, outcome: 'stopped', detail: `the ${kind} flow was cancelled or failed` };
      console.info(`${prefix} runPrimaryAction(${rec.id}): ${result.detail}`);
      return result;
    }
    // 'navigate': nothing here to prefill for this card; it behaves as it did before.
  }

  if (flow.open && rec.actionPayload) {
    if (await flow.open(rec.actionPayload)) {
      const result: ActionResult = { kind, outcome: 'prefilled', detail: `opened ${flow.route} prefilled` };
      console.info(`${prefix} runPrimaryAction(${rec.id}): ${result.detail}`);
      return result;
    }
  }

  deps.navigate(flow.route);
  const result: ActionResult = { kind, outcome: 'navigated', detail: `navigated to ${flow.route} (${flow.accepts})` };
  console.info(
    `${prefix} runPrimaryAction(${rec.id}): ${result.detail}`,
    rec.actionPayload ? { notSent: rec.actionPayload } : '(no payload)'
  );
  return result;
}

export interface ActOnOptions extends ActionDeps {
  /** The visit record's storage (sessionStorage in the app). */
  storage: RecordStorage | null;
  /** The loaded payload's refreshedAt, the record's key; null before a payload loads. */
  refreshedAt: string | null;
  /** Mark the card acted on in page state. Called for prefilled and navigated, never for coming_soon or stopped. */
  onActed: (id: string) => void;
  flows?: Readonly<Record<PrimaryActionKind, ActionFlow | null>>;
}

/**
 * What a primary button (or "Open again") does on the page: run the flow, then,
 * unless it was coming_soon or stopped (a cancelled or failed prefill flow), write
 * the card to this visit's record and mark it acted on. The record is written even when the flow navigated away, so coming
 * back to /insights shows the card acted on. Running it again reruns the flow
 * and keeps the first acted-on time.
 */
export async function actOnRecommendation(
  rec: Pick<Recommendation, 'id' | 'recommendationId' | 'primaryAction' | 'actionPayload'>,
  { storage, refreshedAt, onActed, flows, ...deps }: ActOnOptions
): Promise<ActionResult> {
  const result = await runPrimaryAction(rec, deps, flows);
  if (result.outcome === 'coming_soon' || result.outcome === 'stopped') return result;
  if (refreshedAt !== null) recordActed(storage, refreshedAt, rec.id);
  onActed(rec.id);
  return result;
}
