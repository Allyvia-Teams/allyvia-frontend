import type { CustomersView } from './navigation';

export interface ProspectsCounts {
  leads: number;
  deals: number;
}

/** Undefined (still loading, or never fetched) means hidden — never a flash of a tab that then vanishes. */
export function prospectsAvailable(counts: ProspectsCounts | undefined): boolean {
  if (!counts) return false;
  return counts.leads > 0 || counts.deals > 0;
}

/**
 * Whether Prospects can show, folding in the count query's error state.
 * A failed count is UNKNOWN, not NONE — hiding Prospects on a network blip
 * would look identical to "this company has no leads or deals" when the
 * truth is "we couldn't check". PipelineTab reports its own fetch failure
 * once it mounts.
 */
export function resolveProspectsCanShow(counts: ProspectsCounts | undefined, { isError }: { isError: boolean }): boolean {
  if (isError) return true;
  return prospectsAvailable(counts);
}

export interface CustomersToggleOption {
  value: CustomersView;
  label: string;
}

const BASE_OPTIONS: CustomersToggleOption[] = [
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'all', label: 'All' }
];

const PROSPECTS_OPTION: CustomersToggleOption = { value: 'prospects', label: 'Prospects' };

export function customersToggleOptions(available: boolean): CustomersToggleOption[] {
  return available ? [...BASE_OPTIONS, PROSPECTS_OPTION] : [...BASE_OPTIONS];
}

/** A `?view=prospects` URL on a company with no leads/deals falls back to the leaderboard. */
export function effectiveCustomersView(view: CustomersView, available: boolean): CustomersView {
  return view === 'prospects' && !available ? 'leaderboard' : view;
}

/**
 * The view actually rendered. While the count query is still pending, the
 * requested view is honoured as-is (so a `?view=prospects` deep link doesn't
 * flash the leaderboard and then jump to Prospects once the count lands) —
 * the toggle itself already hides the Prospects option until availability is
 * known, so nothing renders a control for a tab that might vanish. Once the
 * query has settled (success OR error), the gate applies.
 */
export function resolveCustomersView(
  requested: CustomersView,
  { settled, available }: { settled: boolean; available: boolean }
): CustomersView {
  return settled ? effectiveCustomersView(requested, available) : requested;
}
