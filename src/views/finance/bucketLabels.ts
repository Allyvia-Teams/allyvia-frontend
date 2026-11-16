import { BANK_CATEGORIES, type BankCategory } from 'api/banking';

// The one name for each expense bucket, wherever Finance names one: snapshot cards, the
// Expenses chips and Categories, the Profit page, table cells, the bank category select and
// merchant rules. The API's own bucket label is ignored. QuickBooks account-name categories
// ("Wages", "Rent") are not buckets and keep their own names.

export type BucketKey = 'labour' | 'opex' | 'technology' | 'marketing' | 'inventory' | 'capex' | 'unreviewed';

export const BUCKET_LABELS: Record<BucketKey, string> = {
  labour: 'Payroll',
  opex: 'Rent and running costs',
  technology: 'Software',
  marketing: 'Marketing',
  inventory: 'Inventory bought',
  capex: 'Equipment',
  unreviewed: 'Not yet categorized'
};

const isBucket = (key: string): key is BucketKey => Object.prototype.hasOwnProperty.call(BUCKET_LABELS, key);

/** A bucket's name; `needs_review` (the bank's word for unreviewed) reads as unreviewed. */
export function bucketLabel(bucket: string, fallback = ''): string {
  const key = bucket === 'needs_review' ? 'unreviewed' : bucket;
  return isBucket(key) ? BUCKET_LABELS[key] : fallback || bucket;
}

/** A bank category's name: the bucket name for the six buckets and needs review, else the bank's own. */
export const bankCategoryLabel = (category: BankCategory): string => bucketLabel(category, BANK_CATEGORIES[category]);
