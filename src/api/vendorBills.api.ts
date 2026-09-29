import axios from 'utils/axios';
import type { BillPayState, VendorBill, VendorBillInput } from 'types/vendorBills';

const root = '/vendors/bill-pay';
const config = (company: string) => ({ params: { company_id: company } });
export const vendorBillsAPI = {
  state: async (company: string): Promise<BillPayState> => (await axios.get(`${root}/state/`, config(company))).data,
  list: async (company: string, vendorId: number, page: number): Promise<{ results: VendorBill[]; count: number }> =>
    (await axios.get(`${root}/bills/`, { params: { company_id: company, vendor_id: vendorId, page } })).data,
  detail: async (company: string, id: string): Promise<VendorBill> => (await axios.get(`${root}/bills/${id}/`, config(company))).data,
  save: async (company: string, input: VendorBillInput, id?: string): Promise<VendorBill> =>
    (id ? await axios.put(`${root}/bills/${id}/`, input, config(company)) : await axios.post(`${root}/bills/`, input, config(company)))
      .data,
  action: async (company: string, id: string, action: string, body: Record<string, unknown> = {}) =>
    (await axios.post(`${root}/bills/${id}/${action}/`, body, config(company))).data,
  paymentAction: async (company: string, id: string, paymentId: string, action: 'return' | 'cancel', reason: string) =>
    (await axios.post(`${root}/bills/${id}/payments/${paymentId}/${action}/`, { reason }, config(company))).data,
  upload: async (company: string, id: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return (await axios.post(`${root}/bills/${id}/documents/`, body, config(company))).data;
  },
  download: async (company: string, id: string, documentId: string, filename: string) => {
    const response = await axios.get(`${root}/bills/${id}/documents/${documentId}/`, { ...config(company), responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
};
