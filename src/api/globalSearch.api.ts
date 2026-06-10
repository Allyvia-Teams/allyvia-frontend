import { employeeAPI } from 'api/employee.api';
import { getInventoryItems } from 'api/inventory.api';
import { getContacts, getLeads, getDeals } from 'api/crm';
import type { GlobalSearchResult } from 'types/globalSearch';

const RESULTS_PER_GROUP = 5;

export async function searchGlobal(companyId: string, query: string): Promise<GlobalSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const [employeesResult, inventoryResult, contactsResult, leadsResult, dealsResult] = await Promise.allSettled([
    employeeAPI.getEmployees(companyId, trimmed),
    getInventoryItems(companyId, 1, RESULTS_PER_GROUP, trimmed),
    getContacts({ search: trimmed, page: 1, page_size: RESULTS_PER_GROUP }),
    getLeads({ search: trimmed, page: 1, page_size: RESULTS_PER_GROUP }),
    getDeals({ search: trimmed, page: 1, page_size: RESULTS_PER_GROUP })
  ]);

  const results: GlobalSearchResult[] = [];

  if (employeesResult.status === 'fulfilled') {
    employeesResult.value.slice(0, RESULTS_PER_GROUP).forEach((employee) => {
      results.push({
        id: employee.id,
        label: employee.full_name || `${employee.first_name} ${employee.last_name}`.trim(),
        subtitle: employee.email,
        group: 'Employees',
        type: 'employee'
      });
    });
  }

  if (inventoryResult.status === 'fulfilled') {
    inventoryResult.value.items.slice(0, RESULTS_PER_GROUP).forEach((item) => {
      results.push({
        id: String(item.id),
        label: item.name,
        subtitle: item.sku || item.category || undefined,
        group: 'Inventory',
        type: 'inventory'
      });
    });
  }

  if (contactsResult.status === 'fulfilled') {
    contactsResult.value.results.slice(0, RESULTS_PER_GROUP).forEach((contact) => {
      results.push({
        id: contact.id,
        label: contact.name,
        subtitle: contact.email || contact.company_name || undefined,
        group: 'CRM',
        type: 'crm_contact'
      });
    });
  }

  if (leadsResult.status === 'fulfilled') {
    leadsResult.value.results.slice(0, RESULTS_PER_GROUP).forEach((lead) => {
      results.push({
        id: lead.id,
        label: lead.contact_name || 'Lead',
        subtitle: lead.status,
        group: 'CRM',
        type: 'crm_lead'
      });
    });
  }

  if (dealsResult.status === 'fulfilled') {
    dealsResult.value.results.slice(0, RESULTS_PER_GROUP).forEach((deal) => {
      results.push({
        id: deal.id,
        label: deal.name,
        subtitle: deal.stage,
        group: 'CRM',
        type: 'crm_deal'
      });
    });
  }

  return results;
}
