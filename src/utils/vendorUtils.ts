import Papa from 'papaparse';

// Vendor field definitions (backend CSV headers)
export const VENDOR_FIELDS = [
  'name',
  'contact_name',
  'email',
  'phone',
  'website',
  'address_line1',
  'address_line2',
  'city',
  'state',
  'postal_code',
  'country',
  'account_number',
  'tax_id',
  'payment_terms',
  'notes',
  'status'
] as const;
export type VendorField = (typeof VENDOR_FIELDS)[number];
export const REQUIRED_FIELDS: VendorField[] = ['name']; // Only name is required per backend API

export interface VendorFieldConfig {
  key: VendorField;
  label: string;
  required: boolean;
}

export const VENDOR_FIELD_CONFIGS: VendorFieldConfig[] = [
  { key: 'name', label: 'Vendor Name', required: true },
  { key: 'contact_name', label: 'Contact Name', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'website', label: 'Website', required: false },
  { key: 'address_line1', label: 'Address Line 1', required: false },
  { key: 'address_line2', label: 'Address Line 2', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'state', label: 'State', required: false },
  { key: 'postal_code', label: 'Postal Code', required: false },
  { key: 'country', label: 'Country', required: false },
  { key: 'account_number', label: 'Account Number', required: false },
  { key: 'tax_id', label: 'Tax ID', required: false },
  { key: 'payment_terms', label: 'Payment Terms', required: false },
  { key: 'notes', label: 'Notes', required: false },
  { key: 'status', label: 'Status', required: false }
];

export const emptyVendorFieldMap = (): Record<VendorField, string> => ({
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  account_number: '',
  tax_id: '',
  payment_terms: '',
  notes: '',
  status: ''
});

// Normalize a header for fuzzy matching: lowercase, strip everything except letters/digits
const normalizeHeader = (header: string): string => (header || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Synonyms for each field (normalized form) so exports from other POS/accounting systems auto-map
const FIELD_SYNONYMS: Record<VendorField, string[]> = {
  name: ['name', 'vendorname', 'vendor', 'supplier', 'suppliername', 'company', 'companyname', 'businessname', 'payee'],
  contact_name: ['contactname', 'contact', 'contactperson', 'primarycontact', 'attention', 'attn'],
  email: ['email', 'emailaddress', 'contactemail', 'vendoremail', 'supplieremail'],
  phone: ['phone', 'phonenumber', 'phoneno', 'mobile', 'mobilenumber', 'telephone', 'tel', 'cell', 'cellphone', 'contactphone'],
  website: ['website', 'url', 'web', 'site', 'webaddress', 'homepage'],
  address_line1: ['addressline1', 'address1', 'address', 'street', 'streetaddress', 'addr1', 'line1', 'billingaddress'],
  address_line2: ['addressline2', 'address2', 'addr2', 'line2', 'suite', 'unit', 'apt'],
  city: ['city', 'town'],
  state: ['state', 'province', 'region', 'stateprovince'],
  postal_code: ['postalcode', 'zip', 'zipcode', 'postcode', 'zippostalcode'],
  country: ['country', 'countryregion'],
  account_number: ['accountnumber', 'account', 'accountno', 'acctno', 'acct', 'vendoraccount'],
  tax_id: ['taxid', 'taxidnumber', 'taxnumber', 'abn', 'vat', 'vatnumber', 'ein', 'gst', 'gstnumber'],
  payment_terms: ['paymentterms', 'terms', 'paymentterm', 'netterms'],
  notes: ['notes', 'note', 'comments', 'comment', 'memo', 'description'],
  status: ['status', 'vendorstatus', 'isactive']
};

// Auto-map CSV/Excel columns to vendor fields
export const autoMapFields = (csvHeaders: string[]): Record<VendorField, string> => {
  const fieldMap = emptyVendorFieldMap();

  csvHeaders.forEach((header) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return;

    for (const field of VENDOR_FIELDS) {
      if (fieldMap[field]) continue; // Field already mapped by an earlier header
      if (FIELD_SYNONYMS[field].includes(normalized)) {
        fieldMap[field] = header;
        break;
      }
    }
  });

  return fieldMap;
};

// Normalize a raw status value to 'active' | 'inactive' (or null when empty)
export const normalizeStatus = (value: any): string | null => {
  if (value === undefined || value === null) return null;
  const stringValue = value.toString().trim().toLowerCase();
  if (!stringValue) return null;
  if (['inactive', 'disabled', 'no', 'false', '0', 'archived'].includes(stringValue)) return 'inactive';
  return 'active';
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Convert mapped rows to backend format (trim strings, normalize status, null empty values)
export const convertToBackendFormat = (mappedRows: Record<string, any>[]) => {
  return mappedRows.map((row) => {
    const backendRow: Record<string, any> = {};

    VENDOR_FIELDS.forEach((field) => {
      const value = row[field];

      switch (field) {
        case 'name':
          // Required field - keep as string
          backendRow[field] = value ? value.toString().trim() : '';
          break;
        case 'status':
          backendRow[field] = normalizeStatus(value);
          break;
        default:
          // Optional string fields - convert to string, default to null if empty
          backendRow[field] = value && value.toString().trim() ? value.toString().trim() : null;
          break;
      }
    });

    return backendRow;
  });
};

// Build mapped CSV for upload
export const buildMappedCsv = (csvRows: Record<string, any>[], fieldMap: Record<VendorField, string>) => {
  // Map source rows to system fields
  const mappedRows = csvRows.map((row) => {
    const out: Record<string, any> = {};
    VENDOR_FIELDS.forEach((field) => {
      const source = fieldMap[field];
      if (source) {
        out[field] = row[source];
      }
    });
    return out;
  });

  // Convert to backend format
  const backendRows = convertToBackendFormat(mappedRows);

  const csv = Papa.unparse(backendRows, { header: true });
  const blob = new Blob([csv], { type: 'text/csv' });
  const mappedFile = new File([blob], 'vendors_import.csv', { type: 'text/csv' });
  return { csv, blob, file: mappedFile, backendRows };
};

export interface VendorRowValidationError {
  row: number; // 1-based data row number
  field: string;
  message: string;
}

// Client-side validation of mapped rows before upload
export const validateRows = (csvRows: Record<string, any>[], fieldMap: Record<VendorField, string>): VendorRowValidationError[] => {
  const errors: VendorRowValidationError[] = [];

  csvRows.forEach((row, index) => {
    const rowNumber = index + 1;

    const nameSource = fieldMap.name;
    const name = nameSource ? (row[nameSource] ?? '').toString().trim() : '';
    if (!name) {
      errors.push({ row: rowNumber, field: 'name', message: 'Vendor name is required' });
    }

    const emailSource = fieldMap.email;
    if (emailSource) {
      const email = (row[emailSource] ?? '').toString().trim();
      if (email && !EMAIL_REGEX.test(email)) {
        errors.push({ row: rowNumber, field: 'email', message: `Invalid email format: ${email}` });
      }
    }
  });

  return errors;
};

// Download just the header template based on VENDOR_FIELDS (local fallback)
export const downloadVendorTemplate = () => {
  const csv = Papa.unparse({ fields: [...VENDOR_FIELDS], data: [] as any[] });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vendor_template.csv';
  a.click();
  URL.revokeObjectURL(url);
};
