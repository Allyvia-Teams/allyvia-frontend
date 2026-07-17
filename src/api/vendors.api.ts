import axiosServices from 'utils/axios';
import {
  Vendor,
  VendorListResponse,
  VendorCreateResponse,
  VendorGetResponse,
  VendorUpdateResponse,
  VendorDeleteResponse,
  VendorUploadResult
} from 'types/vendor';

const BASE_URL = '/vendors';

// GET All Vendors (paginated)
export const getVendors = async (
  companyId: string,
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  status?: string
): Promise<VendorListResponse> => {
  const response = await axiosServices.get(`${BASE_URL}/db/`, {
    params: {
      company_id: companyId,
      page,
      page_size: pageSize,
      ...(search ? { search } : {}),
      ...(status ? { status } : {})
    }
  });
  return response.data;
};

// GET Vendor
export const getVendor = async (vendorId: number | string, companyId: string): Promise<VendorGetResponse> => {
  const response = await axiosServices.get(`${BASE_URL}/manage/?company_id=${companyId}&id=${vendorId}`);
  return response.data;
};

// CREATE Vendor
export const createVendor = async (vendorData: Partial<Vendor>, companyId: string): Promise<VendorCreateResponse> => {
  const response = await axiosServices.post(`${BASE_URL}/manage/?company_id=${companyId}`, vendorData);
  return response.data;
};

// UPDATE Vendor
export const updateVendor = async (
  vendorId: number | string,
  vendorData: Partial<Vendor>,
  companyId: string
): Promise<VendorUpdateResponse> => {
  const response = await axiosServices.put(`${BASE_URL}/manage/?company_id=${companyId}&id=${vendorId}`, vendorData);
  return response.data;
};

// DELETE Vendor (soft delete)
export const deleteVendor = async (vendorId: number | string, companyId: string): Promise<VendorDeleteResponse> => {
  const response = await axiosServices.delete(`${BASE_URL}/manage/?company_id=${companyId}&id=${vendorId}`);
  return response.data;
};

// CSV Upload
export const uploadVendorCsv = async (
  file: File,
  companyId: string,
  onProgress?: (progress: number) => void
): Promise<VendorUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axiosServices.post(`${BASE_URL}/bulk_upload/?company_id=${companyId}`, formData, {
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    }
  });

  return response.data;
};

// CSV Template Download (fetches blob and triggers browser download)
export const downloadVendorCsvTemplate = async (companyId: string): Promise<Blob> => {
  const response = await axiosServices.get(`${BASE_URL}/csv_template/?company_id=${companyId}`, { responseType: 'blob' });
  const blob: Blob = response.data;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vendor_template.csv';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return blob;
};

// Default export for parity with inventory.api.ts
export default {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  uploadVendorCsv,
  downloadVendorCsvTemplate
};
