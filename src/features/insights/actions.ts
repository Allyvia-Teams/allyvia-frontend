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
// To wire a prefill later, give that kind's flow an `open(payload)` that
// returns true when it took the payload; runPrimaryAction then reports
// 'prefilled'. A kind mapped to null has no flow at all: it shows the
// "coming soon" toast and the card is not marked acted on.

import type { PrimaryActionKind, Recommendation } from './types';
import { recordActed, type RecordStorage } from './visitRecord';

export type ActionOutcome = 'prefilled' | 'navigated' | 'coming_soon';

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
}

export const ACTION_FLOWS: Readonly<Record<PrimaryActionKind, ActionFlow | null>> = {
  purchase_order: {
    route: '/inventory/purchase-orders/new',
    accepts: 'a blank draft; the editor reads only the :purchaseOrderId route param'
  },
  markdown: {
    route: '/inventory/insights?tab=markdown-candidates',
    accepts: 'a tab only; there is no price-change or markdown scheduler'
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
}

const prefix = '[insights-redesign]';

export async function runPrimaryAction(
  rec: Pick<Recommendation, 'id' | 'primaryAction' | 'actionPayload'>,
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
  /** Mark the card acted on in page state. Called for prefilled and navigated, never for coming_soon. */
  onActed: (id: string) => void;
  flows?: Readonly<Record<PrimaryActionKind, ActionFlow | null>>;
}

/**
 * What a primary button (or "Open again") does on the page: run the flow, then,
 * unless it was coming_soon, write the card to this visit's record and mark it
 * acted on. The record is written even when the flow navigated away, so coming
 * back to /insights shows the card acted on. Running it again reruns the flow
 * and keeps the first acted-on time.
 */
export async function actOnRecommendation(
  rec: Pick<Recommendation, 'id' | 'primaryAction' | 'actionPayload'>,
  { storage, refreshedAt, onActed, flows, ...deps }: ActOnOptions
): Promise<ActionResult> {
  const result = await runPrimaryAction(rec, deps, flows);
  if (result.outcome === 'coming_soon') return result;
  if (refreshedAt !== null) recordActed(storage, refreshedAt, rec.id);
  onActed(rec.id);
  return result;
}
