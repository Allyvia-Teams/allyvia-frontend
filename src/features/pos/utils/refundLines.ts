// From the axios-free taxonomy module, not from `stripe.api` — importing the
// API client here would drag its browser-only init into every unit test.
import { DEFAULT_REFUND_DISPOSITION, type PosRefundLineSelection, type RefundDisposition } from 'api/refundDispositions';

import type { CartItem } from '../types/pos.types';

/**
 * The maths behind "Return specific items".
 *
 * Pure and separate from the dialog for the same reason `refundView` is: this
 * decides how much money goes back. A stepper that lets a clerk return three
 * of two sold units is an over-refund the server will reject; one that caps at
 * the wrong number is a customer sent away with goods they should have been
 * paid for.
 *
 * The ceiling is always the server's `refundableQuantity`, never `quantity`
 * minus something computed here — the server derives it from units already
 * returned, and a second derivation on the client is a second chance to be
 * wrong about a sale that was partially refunded an hour ago.
 */

export interface RefundLineDraft {
  lineId: string;
  name: string;
  sku: string;
  /** Units sold on this line. */
  quantity: number;
  /** Units already handed back. */
  returnedQuantity: number;
  /** The stepper's ceiling — what may still be returned. */
  refundableQuantity: number;
  /** Units the clerk has selected. 0 means "not returning this line". */
  selectedQuantity: number;
  disposition: RefundDisposition;
  /** Per-unit price in major units, for the subtotal. */
  unitPrice: number;
}

/** A line with nothing left to return cannot be selected at all. */
export const isLineReturnable = (line: { refundableQuantity: number }): boolean => line.refundableQuantity > 0;

/**
 * Build the dialog's initial draft from a sale's lines.
 *
 * Every line starts at zero selected: a return is an explicit act per line,
 * and pre-selecting everything turns "return one shirt" into "refund the whole
 * receipt" for a clerk who taps Submit too fast. Lines with nothing left to
 * return are kept (so the clerk can see they exist and why they are greyed)
 * rather than hidden.
 */
export function buildRefundLineDrafts(items: CartItem[]): RefundLineDraft[] {
  return items
    .filter((item) => Boolean(item.lineId))
    .map((item) => {
      const quantity = item.quantity;
      const returnedQuantity = item.returnedQuantity ?? 0;
      // Fall back to sold-minus-returned only when the server did not say.
      // Clamped at zero: a line whose returned count somehow exceeds its sold
      // count must offer nothing, not a negative ceiling.
      const refundableQuantity = Math.max(0, item.refundableQuantity ?? quantity - returnedQuantity);
      return {
        lineId: String(item.lineId),
        name: item.product.name,
        sku: item.product.sku,
        quantity,
        returnedQuantity,
        refundableQuantity,
        selectedQuantity: 0,
        disposition: DEFAULT_REFUND_DISPOSITION,
        unitPrice: item.product.price
      };
    });
}

/**
 * Set one line's selected quantity, clamped into [0, refundableQuantity].
 *
 * Clamping rather than rejecting: the stepper's + button at the ceiling should
 * do nothing, not throw, and a hand-typed 99 should land on the ceiling rather
 * than submit an over-refund.
 */
export function setLineQuantity(lines: RefundLineDraft[], lineId: string, quantity: number): RefundLineDraft[] {
  return lines.map((line) => {
    if (line.lineId !== lineId) return line;
    const wanted = Number.isFinite(quantity) ? Math.floor(quantity) : 0;
    return { ...line, selectedQuantity: Math.max(0, Math.min(wanted, line.refundableQuantity)) };
  });
}

/** Set one line's disposition. Does not touch the quantity. */
export function setLineDisposition(lines: RefundLineDraft[], lineId: string, disposition: RefundDisposition): RefundLineDraft[] {
  return lines.map((line) => (line.lineId === lineId ? { ...line, disposition } : line));
}

/**
 * What the customer gets back, in MAJOR units, for the current selection.
 *
 * An estimate shown before submitting, not the authority: the server computes
 * the real figure from its own prices and subtracts any restocking fee, and
 * per-line discounts and tax are not modelled here. The dialog must label it
 * as an estimate for exactly that reason.
 */
export function refundSubtotal(lines: RefundLineDraft[]): number {
  const total = lines.reduce((sum, line) => sum + line.selectedQuantity * line.unitPrice, 0);
  // Two decimals, so 3 x 19.99 reads as 59.97 and not 59.969999999999999.
  return Math.round(total * 100) / 100;
}

/** Total units selected across every line. */
export function selectedUnitCount(lines: RefundLineDraft[]): number {
  return lines.reduce((sum, line) => sum + line.selectedQuantity, 0);
}

/**
 * The payload for `refundPosSaleLines` — only the lines with units selected.
 *
 * A line at zero is omitted entirely rather than sent with quantity 0, which
 * the server rejects (`min_value=1`): "I am not returning this" and "I am
 * returning none of this" are the same fact, and only one of them is a
 * well-formed request.
 */
export function toRefundLineSelections(lines: RefundLineDraft[]): PosRefundLineSelection[] {
  return lines
    .filter((line) => line.selectedQuantity > 0)
    .map((line) => ({
      line_id: line.lineId,
      quantity: line.selectedQuantity,
      disposition: line.disposition
    }));
}

/** Whether the selection can be submitted at all. */
export function canSubmitLineRefund(lines: RefundLineDraft[]): boolean {
  return selectedUnitCount(lines) > 0;
}
