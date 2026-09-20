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
  return available ? [...BASE_OPTIONS, PROSPECTS_OPTION] : BASE_OPTIONS;
}

/** A `?view=prospects` URL on a company with no leads/deals falls back to the leaderboard. */
export function effectiveCustomersView(view: CustomersView, available: boolean): CustomersView {
  return view === 'prospects' && !available ? 'leaderboard' : view;
}
