import { BANK_CATEGORIES, type BankCategory } from 'api/banking';
import { BUCKET_LABELS as X5_BUCKET_LABELS, UNSORTED_LABEL } from './expenseTruth';

// The one name for each expense bucket, wherever Finance names one: snapshot cards, the
// Expenses chips and Categories, the Profit page's bucket rows, table cells, the bank category
// select, the Sort drawer and merchant rules. The words are expense truth X5's own map
// (expenseTruth.BUCKET_LABELS), imported rather than copied so the two cannot drift; this file
// only adds the unsorted pseudo-bucket. The API's own bucket label is ignored. QuickBooks
// account-name categories ("Wages", "Rent") are not buckets and keep their own names.
// The one exception is a figure, not a bucket: the snapshot and Profit pages title the
// standalone inventory figure INVENTORY_BOUGHT_TITLE, because it sits beside "Inventory at cost".

export type BucketKey = 'labour' | 'opex' | 'technology' | 'marketing' | 'inventory' | 'capex' | 'unreviewed';

export const BUCKET_LABELS: Record<BucketKey, string> = { ...X5_BUCKET_LABELS, unreviewed: UNSORTED_LABEL };

/** The standalone inventory figure's title on the snapshot and Profit pages (never a bucket name). */
export const INVENTORY_BOUGHT_TITLE = 'Inventory bought';

const isBucket = (key: string): key is BucketKey => Object.prototype.hasOwnProperty.call(BUCKET_LABELS, key);

/** A bucket's name; `needs_review` (the bank's word for unreviewed) reads as unreviewed. */
export function bucketLabel(bucket: string, fallback = ''): string {
  const key = bucket === 'needs_review' ? 'unreviewed' : bucket;
  return isBucket(key) ? BUCKET_LABELS[key] : fallback || bucket;
}

/** A bank category's name: the bucket name for the six buckets and needs review, else the bank's own. */
export const bankCategoryLabel = (category: BankCategory): string => bucketLabel(category, BANK_CATEGORIES[category]);
