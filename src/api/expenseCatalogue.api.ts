import axios from 'utils/axios';
import type { ExpenseCategory, ExpenseForm, NativeExpense, ExpenseReport } from 'types/expenseCatalogue';
const root = '/expense/catalogue';
export const expenseCatalogueAPI = (company: string) => {
  const config = { params: { company_id: company } };
  return {
    categories: async (): Promise<ExpenseCategory[]> => (await axios.get(`${root}/categories/`, config)).data,
    category: async (data: Partial<ExpenseCategory>, id?: string): Promise<ExpenseCategory> =>
      (await (id ? axios.patch(`${root}/categories/${id}/`, data, config) : axios.post(`${root}/categories/`, data, config))).data,
    entries: async (params: Record<string, string | number>): Promise<{ count: number; results: NativeExpense[] }> =>
      (await axios.get(`${root}/entries/`, { params: { ...params, company_id: company } })).data,
    save: async (data: ExpenseForm, id?: string): Promise<NativeExpense> =>
      (await (id ? axios.put(`${root}/entries/${id}/`, data, config) : axios.post(`${root}/entries/`, data, config))).data,
    void: async (id: string, reason: string) => axios.post(`${root}/entries/${id}/void/`, { reason }, config),
    settle: async (id: string, amount: string, paid_date: string, reference: string) =>
      axios.post(`${root}/entries/${id}/settlements/`, { amount, paid_date, reference }, config),
    reverse: async (id: string, settlement: string, reversal_date: string, reason: string) =>
      axios.post(`${root}/entries/${id}/settlements/${settlement}/reverse/`, { reversal_date, reason }, config),
    import: async (csv: string) => axios.post(`${root}/import/`, { csv }, config),
    report: async (params: Record<string, string>, analytics = false): Promise<ExpenseReport> =>
      (await axios.get(`${root}/${analytics ? 'analytics' : 'summary'}/`, { params: { ...params, company_id: company } })).data
  };
};
