// "Which of these repeat?" after an expense import, and the words for a cadence.
// Pure: the dialog and the recurring list render from here.
import type { Cadence, ExpenseCategory, RecurringPayload, SuggestedGroup } from 'types/expenseCatalogue';

export type RepeatChoice = Cadence | 'never';

export const CHOICES: { value: RepeatChoice; label: string }[] = [
  { value: 'never', label: 'Never' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

export interface RepeatRow {
  key: string;
  group: SuggestedGroup;
  payee: string;
  amountLabel: string;
  countLabel: string;
  choice: RepeatChoice;
  categoryId: string;
  categoryName: string;
  treatment: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "$1,200" for a whole amount, "$85.50" otherwise. Not a locale-sensitive Date anywhere. */
export function sentenceMoney(amount: string, currency: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${amount} ${currency}`.trim();
  const whole = Math.round(value * 100) % 100 === 0;
  const digits = whole ? 0 : 2;
  if (!/^[A-Z]{3}$/.test(currency)) return `${value.toFixed(digits)} ${currency}`.trim();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

/** "$1,200 every month on day 1", "$85 every two weeks", "$900 every year on 10 March". */
export function cadenceSentence(item: {
  amount: string;
  currency: string;
  cadence?: string;
  day_of_month: number;
  start_date: string;
}): string {
  const money = sentenceMoney(item.amount, item.currency);
  switch (item.cadence) {
    case 'weekly':
      return `${money} every week`;
    case 'biweekly':
      return `${money} every two weeks`;
    case 'yearly': {
      const month = MONTHS[Number(item.start_date.slice(5, 7)) - 1];
      return month ? `${money} every year on ${item.day_of_month} ${month}` : `${money} every year`;
    }
    default:
      return `${money} every month on day ${item.day_of_month}`;
  }
}

function countLabel(count: number): string {
  return `${count} times`;
}

export function rowsFor(groups: SuggestedGroup[]): RepeatRow[] {
  return groups.map((group) => ({
    key: group.entry_ids[0] ?? `${group.payee}:${group.amount}`,
    group,
    payee: group.payee,
    amountLabel: sentenceMoney(group.amount, group.currency),
    countLabel: countLabel(group.count),
    choice: group.suggested_cadence ?? 'never',
    categoryId: group.category_id,
    categoryName: group.category_name,
    treatment: group.treatment
  }));
}

/** Changing the category also takes that category's usual treatment, as the recurring form does. */
export function withCategory(row: RepeatRow, categoryId: string, categories: ExpenseCategory[]): RepeatRow {
  const found = categories.find((c) => c.id === categoryId);
  if (!found) return row;
  return { ...row, categoryId: found.id, categoryName: found.name, treatment: found.default_treatment || row.treatment };
}

/** Weekly and every-two-weeks bills have no day of the month: it is the start date's day. */
export function payloadFor(row: RepeatRow, requestId: string): RecurringPayload | null {
  if (row.choice === 'never') return null;
  const { group } = row;
  const start = group.starts[row.choice];
  const day = row.choice === 'weekly' || row.choice === 'biweekly' ? Number(start.slice(8, 10)) : group.day_of_month;
  const first = group.dates[0];
  const last = group.dates[group.dates.length - 1];
  return {
    request_id: requestId,
    name: group.name || group.payee,
    amount: group.amount,
    currency: group.currency,
    category_id: row.categoryId,
    treatment: row.treatment,
    payee: group.payee,
    source_reference: `Repeats of ${group.count} imported expenses, ${first} to ${last}`,
    start_date: start,
    day_of_month: day,
    cadence: row.choice
  };
}

/** One payload per row that repeats; each row keeps its own request id, so a retry replays instead of doubling. */
export function payloadsFor(rows: RepeatRow[], requestIdFor: (row: RepeatRow) => string): RecurringPayload[] {
  return rows.flatMap((row) => {
    const payload = payloadFor(row, requestIdFor(row));
    return payload ? [payload] : [];
  });
}

export function savedMessage(count: number): string {
  if (count === 0) return 'Nothing set to repeat.';
  return count === 1 ? '1 repeating expense saved.' : `${count} repeating expenses saved.`;
}
