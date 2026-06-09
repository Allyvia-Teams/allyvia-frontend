export type GlobalSearchResultType = 'employee' | 'inventory' | 'crm_contact' | 'crm_lead' | 'crm_deal';

export interface GlobalSearchResult {
  id: string;
  label: string;
  subtitle?: string;
  group: 'Employees' | 'Inventory' | 'CRM';
  type: GlobalSearchResultType;
}

export function getSearchResultPath(result: GlobalSearchResult): string {
  switch (result.type) {
    case 'employee':
      return `/employees?employeeId=${result.id}`;
    case 'inventory':
      return `/inventory?itemId=${result.id}`;
    case 'crm_contact':
      return `/crm?tab=contacts&recordId=${result.id}`;
    case 'crm_lead':
      return `/crm?tab=leads&recordId=${result.id}`;
    case 'crm_deal':
      return `/crm?tab=deals&recordId=${result.id}`;
    default:
      return '/';
  }
}
