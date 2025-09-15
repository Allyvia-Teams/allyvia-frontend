import Papa from 'papaparse';

// Barcode validation (global) – support: 'EAN13' | 'EAN8' | 'EAN5' | 'EAN2' | 'UPC' | 'UPCE'
export type SupportedBarcodeFormat = 'EAN13' | 'EAN8' | 'EAN5' | 'EAN2' | 'UPC' | 'UPCE';

const digitsOnly = (s: string) => (s || '').replace(/\D/g, '');

const isValidEAN13 = (code: string) => {
  if (!/^\d{13}$/.test(code)) return false;
  const arr = code.split('').map((c) => parseInt(c, 10));
  const sum = arr.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return check === arr[12];
};

const isValidEAN8 = (code: string) => {
  if (!/^\d{8}$/.test(code)) return false;
  const arr = code.split('').map((c) => parseInt(c, 10));
  const sum = arr.slice(0, 7).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  const check = (10 - (sum % 10)) % 10;
  return check === arr[7];
};

const isValidUPCA = (code: string) => {
  if (!/^\d{12}$/.test(code)) return false;
  const arr = code.split('').map((c) => parseInt(c, 10));
  const sumOdd = arr.slice(0, 11).reduce((acc, d, i) => acc + (i % 2 === 0 ? d : 0), 0);
  const sumEven = arr.slice(0, 11).reduce((acc, d, i) => acc + (i % 2 === 1 ? d : 0), 0);
  const total = sumOdd * 3 + sumEven;
  const check = (10 - (total % 10)) % 10;
  return check === arr[11];
};

const isValidUPCE = (code: string) => /^\d{8}$/.test(code); // JsBarcode validates details; length check here
const isValidAddon = (code: string) => code === '' || /^\d{2}$/.test(code) || /^\d{5}$/.test(code);

export const detectBarcodeFormat = (raw: string): SupportedBarcodeFormat | null => {
  if (!raw) return null;
  const [mainPart, addon = ''] = raw.split(' ');
  const main = digitsOnly(mainPart);
  const add = digitsOnly(addon);
  if (!isValidAddon(add)) return null;

  if (main.length === 13 && isValidEAN13(main)) return 'EAN13';
  if (main.length === 12 && isValidUPCA(main)) return 'UPC';
  if (main.length === 8 && isValidEAN8(main)) return 'EAN8';
  if (main.length === 8 && isValidUPCE(main)) return 'UPCE';
  if (main.length === 5 && /^\d{5}$/.test(main)) return 'EAN5';
  if (main.length === 2 && /^\d{2}$/.test(main)) return 'EAN2';
  return null;
};

export const validateBarcode = (barcode: string): { isValid: boolean; error?: string; format?: SupportedBarcodeFormat } => {
  if (!barcode || barcode.trim() === '') {
    return { isValid: true }; // Optional field
  }
  const fmt = detectBarcodeFormat(barcode);
  if (fmt) return { isValid: true, format: fmt };
  return {
    isValid: false,
    error: 'Invalid barcode. Supported: EAN-13, EAN-8, UPC-A, UPC-E, EAN-2, EAN-5'
  };
};

export const getBarcodeType = (barcode: string): SupportedBarcodeFormat | null => detectBarcodeFormat(barcode);

// Business Categories for Inventory Management
export const BUSINESS_INVENTORY_CATEGORIES = [
  // Inventory Items (Track Quantity)
  'Software Licenses',
  'Hardware Equipment',
  'Office Supplies',
  'Medical Supplies',
  'Tools & Equipment',
  'Sports Equipment',
  'Toiletries & Personal Care',
  'Food & Beverage',
  'Electronics',
  'Furniture',
  'Clothing & Apparel',
  'Automotive Parts',
  'Industrial Supplies',
  'Building Materials',
  'Cleaning Supplies',
  'Safety Equipment',
  'Packaging Materials',
  'Raw Materials',
  'Manufacturing Supplies',
  'Retail Products',
  'Wholesale Products',
  'Training Materials',
  'Educational Supplies',
  'Marketing Materials',
  'Promotional Items',
  'Gift Items',
  'Seasonal Products',
  'Custom Products',
  'Special Orders',
  'Discontinued Items',
  'Clearance Items',
  'Sale Items',

  // Services
  'Professional Services',
  'Consulting Services',
  'Maintenance Services',
  'Repair Services',
  'Installation Services',
  'Technical Support',
  'Customer Service',
  'Training Services',
  'Educational Services',
  'Marketing Services',
  'Advertising Services',
  'Design Services',
  'Development Services',
  'Implementation Services',
  'Integration Services',
  'Customization Services',
  'Testing Services',
  'Quality Assurance Services',
  'Project Management Services',
  'Business Analysis Services',
  'Data Analysis Services',
  'Research Services',
  'Legal Services',
  'Accounting Services',
  'Financial Services',
  'Insurance Services',
  'Real Estate Services',
  'Transportation Services',
  'Logistics Services',
  'Warehousing Services',
  'Shipping Services',
  'Delivery Services',
  'Cleaning Services',
  'Security Services',
  'IT Services',
  'Software Services',
  'Hardware Services',
  'Network Services',
  'Cloud Services',
  'Hosting Services',
  'Backup Services',
  'Recovery Services',
  'Monitoring Services',
  'Maintenance Contracts',
  'Support Contracts',
  'Service Agreements',
  'Warranty Services',
  'Extended Warranty',
  'Service Plans',
  'Subscription Services',
  'Membership Services',
  'Licensing Services',
  'Certification Services',
  'Compliance Services',
  'Audit Services',
  'Inspection Services',
  'Testing Services',
  'Calibration Services',
  'Other Services',

  // Utility Categories
  'Other',
  'Uncategorized'
] as const;

export type BusinessCategory = (typeof BUSINESS_INVENTORY_CATEGORIES)[number];

// Helper function to get categories by item type
export const getCategoriesByItemType = (itemType: 'Inventory' | 'NonInventory' | 'Service') => {
  const inventoryCategories = [
    'Software Licenses',
    'Hardware Equipment',
    'Office Supplies',
    'Medical Supplies',
    'Tools & Equipment',
    'Sports Equipment',
    'Toiletries & Personal Care',
    'Food & Beverage',
    'Electronics',
    'Furniture',
    'Clothing & Apparel',
    'Automotive Parts',
    'Industrial Supplies',
    'Building Materials',
    'Cleaning Supplies',
    'Safety Equipment',
    'Packaging Materials',
    'Raw Materials',
    'Manufacturing Supplies',
    'Retail Products',
    'Wholesale Products',
    'Training Materials',
    'Educational Supplies',
    'Marketing Materials',
    'Promotional Items',
    'Gift Items',
    'Seasonal Products',
    'Custom Products',
    'Special Orders',
    'Discontinued Items',
    'Clearance Items',
    'Sale Items'
  ];

  const serviceCategories = [
    'Professional Services',
    'Consulting Services',
    'Maintenance Services',
    'Repair Services',
    'Installation Services',
    'Technical Support',
    'Customer Service',
    'Training Services',
    'Educational Services',
    'Marketing Services',
    'Advertising Services',
    'Design Services',
    'Development Services',
    'Implementation Services',
    'Integration Services',
    'Customization Services',
    'Testing Services',
    'Quality Assurance Services',
    'Project Management Services',
    'Business Analysis Services',
    'Data Analysis Services',
    'Research Services',
    'Legal Services',
    'Accounting Services',
    'Financial Services',
    'Insurance Services',
    'Real Estate Services',
    'Transportation Services',
    'Logistics Services',
    'Warehousing Services',
    'Shipping Services',
    'Delivery Services',
    'Cleaning Services',
    'Security Services',
    'IT Services',
    'Software Services',
    'Hardware Services',
    'Network Services',
    'Cloud Services',
    'Hosting Services',
    'Backup Services',
    'Recovery Services',
    'Monitoring Services',
    'Maintenance Contracts',
    'Support Contracts',
    'Service Agreements',
    'Warranty Services',
    'Extended Warranty',
    'Service Plans',
    'Subscription Services',
    'Membership Services',
    'Licensing Services',
    'Certification Services',
    'Compliance Services',
    'Audit Services',
    'Inspection Services',
    'Testing Services',
    'Calibration Services',
    'Other Services'
  ];

  const utilityCategories = ['Other', 'Uncategorized'];

  switch (itemType) {
    case 'Inventory':
      return [...inventoryCategories, ...utilityCategories];
    case 'NonInventory':
      return [...inventoryCategories, ...utilityCategories];
    case 'Service':
      return [...serviceCategories, ...utilityCategories];
    default:
      return BUSINESS_INVENTORY_CATEGORIES;
  }
};

// Inventory field definitions
export const INVENTORY_FIELDS = [
  'sku',
  'name',
  'barcode',
  'description',
  'quantity_on_hand',
  'unit_price',
  'cost_price',
  'category',
  'reorder_point',
  'max_stock_level',
  'item_type',
  'status',
  'is_taxable',
  'weight',
  'dimensions_length',
  'dimensions_width',
  'dimensions_height',
  'location',
  'bin_location'
] as const;
export type InventoryField = (typeof INVENTORY_FIELDS)[number];
export const REQUIRED_FIELDS: InventoryField[] = ['name']; // Only name is required per backend API

// Enhanced error type for better error handling
export type EnhancedError = {
  row: number;
  field: string;
  message: string;
  csvValue?: string;
  suggestedFix?: string;
  severity: 'error' | 'warning';
};

// Convert mapped CSV to backend format
export const convertToBackendFormat = (mappedRows: Record<string, any>[]) => {
  return mappedRows.map((row) => {
    const backendRow: Record<string, any> = {};

    // Map each field to backend format
    INVENTORY_FIELDS.forEach((field) => {
      const value = row[field];

      // Apply backend-specific transformations
      switch (field) {
        case 'quantity_on_hand':
        case 'max_stock_level':
        case 'reorder_point':
          // Convert to integer, default to null if invalid or empty
          backendRow[field] = value && !isNaN(Number(value)) ? Math.floor(Number(value)) : null;
          break;
        case 'unit_price':
        case 'cost_price':
        case 'weight':
        case 'dimensions_length':
        case 'dimensions_width':
        case 'dimensions_height':
          // Convert to number with 2 decimal places, default to null if invalid
          backendRow[field] = value && !isNaN(Number(value)) ? Number(Number(value).toFixed(2)) : null;
          break;
        case 'sku':
        case 'barcode':
        case 'item_type':
        case 'status':
        case 'location':
        case 'bin_location':
          // Convert to string, default to null if empty
          backendRow[field] = value && value.toString().trim() ? value.toString().trim() : null;
          break;
        case 'name':
          // Required field - keep as string
          backendRow[field] = value ? value.toString().trim() : '';
          break;
        case 'description':
        case 'category':
          // Optional fields - convert to string, default to null if empty
          backendRow[field] = value && value.toString().trim() ? value.toString().trim() : null;
          break;
        case 'is_taxable':
          // Convert to boolean, default to false for is_taxable
          if (value === undefined || value === null || value === '') {
            backendRow[field] = false;
          } else {
            const stringValue = value.toString().toLowerCase();
            backendRow[field] = stringValue === 'true' || stringValue === '1' || stringValue === 'yes' || stringValue === 'y';
          }
          break;
        default:
          backendRow[field] = value;
      }
    });

    return backendRow;
  });
};

// Auto-map CSV columns to inventory fields
export const autoMapFields = (csvHeaders: string[]): Record<InventoryField, string> => {
  const fieldMap: Record<InventoryField, string> = {
    sku: '',
    name: '',
    barcode: '',
    description: '',
    quantity_on_hand: '',
    unit_price: '',
    cost_price: '',
    category: '',
    reorder_point: '',
    max_stock_level: '',
    item_type: '',
    status: '',
    is_taxable: '',
    weight: '',
    dimensions_length: '',
    dimensions_width: '',
    dimensions_height: '',
    location: '',
    bin_location: ''
  };

  csvHeaders.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim();

    // Direct matches and variations
    if (lowerHeader === 'sku') fieldMap.sku = header;
    else if (lowerHeader === 'name') fieldMap.name = header;
    else if (lowerHeader === 'barcode') fieldMap.barcode = header;
    else if (
      lowerHeader === 'description' ||
      lowerHeader === 'desc' ||
      lowerHeader.includes('description') ||
      lowerHeader.includes('desc') ||
      lowerHeader.includes('product description') ||
      lowerHeader.includes('item description')
    )
      fieldMap.description = header;
    else if (lowerHeader === 'quantity_on_hand' || lowerHeader === 'quantity') fieldMap.quantity_on_hand = header;
    else if (lowerHeader === 'unit_price' || lowerHeader === 'unit price') fieldMap.unit_price = header;
    else if (lowerHeader === 'cost_price' || lowerHeader === 'cost price') fieldMap.cost_price = header;
    else if (lowerHeader === 'category') fieldMap.category = header;
    else if (lowerHeader === 'reorder_point' || lowerHeader === 'reorder point') fieldMap.reorder_point = header;
    else if (lowerHeader === 'max_stock_level' || lowerHeader === 'max stock level' || lowerHeader === 'max stock')
      fieldMap.max_stock_level = header;
    else if (lowerHeader === 'item_type' || lowerHeader === 'item type' || lowerHeader === 'type') fieldMap.item_type = header;
    else if (lowerHeader === 'status') fieldMap.status = header;
    else if (lowerHeader === 'is_taxable' || lowerHeader === 'is taxable' || lowerHeader === 'taxable') fieldMap.is_taxable = header;
    else if (lowerHeader === 'weight') fieldMap.weight = header;
    else if (lowerHeader === 'dimensions_length' || lowerHeader === 'dimensions length' || lowerHeader === 'length')
      fieldMap.dimensions_length = header;
    else if (lowerHeader === 'dimensions_width' || lowerHeader === 'dimensions width' || lowerHeader === 'width')
      fieldMap.dimensions_width = header;
    else if (lowerHeader === 'dimensions_height' || lowerHeader === 'dimensions height' || lowerHeader === 'height')
      fieldMap.dimensions_height = header;
    else if (lowerHeader === 'location') fieldMap.location = header;
    else if (lowerHeader === 'bin_location' || lowerHeader === 'bin location' || lowerHeader === 'bin') fieldMap.bin_location = header;
  });

  return fieldMap;
};

// Process errors with enhanced details
export const processErrors = (errors: { row: number; field: string; message: string }[], csvData?: any[]): EnhancedError[] => {
  const errorMap = new Map<number, EnhancedError[]>();

  errors.forEach((error) => {
    if (!errorMap.has(error.row)) {
      errorMap.set(error.row, []);
    }

    const enhancedError: EnhancedError = {
      row: error.row,
      field: error.field,
      message: error.message,
      csvValue: csvData?.[error.row]?.[error.field] || '',
      suggestedFix: getSuggestedFix(error.field, error.message),
      severity: classifyErrorSeverity(error.field, error.message)
    };

    errorMap.get(error.row)!.push(enhancedError);
  });

  // Convert to array and sort by row, then by severity
  const processedErrors = Array.from(errorMap.values()).flat();
  return processedErrors.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
    return 0;
  });
};

// Get suggested fix for common errors
const getSuggestedFix = (field: string, message: string): string => {
  if (message.includes('Required')) {
    return `Provide a value for ${field}`;
  }
  if (message.includes('number')) {
    return `Enter a valid number for ${field}`;
  }
  if (message.includes('duplicate')) {
    return `Use a unique value for ${field}`;
  }
  if (message.includes('format')) {
    return `Check the format of ${field}`;
  }
  return `Review the ${field} value`;
};

// Classify error severity
const classifyErrorSeverity = (field: string, message: string): 'error' | 'warning' => {
  if (message.includes('Required') || message.includes('duplicate')) {
    return 'error';
  }
  if (message.includes('format') || message.includes('number')) {
    return 'warning';
  }
  return 'error';
};

// Build mapped CSV for upload
export const buildMappedCsv = (csvRows: any[], fieldMap: Record<InventoryField, string>) => {
  // Map CSV rows to system fields and apply defaults for certain fields
  const mappedRows = csvRows.map((row) => {
    const out: Record<string, any> = {};
    INVENTORY_FIELDS.forEach((field) => {
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
  const mappedFile = new File([blob], `backend_inventory_${Date.now()}.csv`, { type: 'text/csv' });
  return { csv, blob, file: mappedFile, backendRows };
};

// Generate comprehensive demo data with various error types
export const generateDemoData = () => {
  const demoRows = [];

  // Valid rows (45 out of 50)
  for (let i = 1; i <= 45; i++) {
    demoRows.push({
      sku: `SKU-${String(i).padStart(3, '0')}`,
      name: `Product ${i}`,
      barcode: generateValidBarcode(),
      description: `Description for Product ${i}`,
      quantity_on_hand: Math.floor(Math.random() * 100) + 1,
      unit_price: (Math.random() * 100 + 10).toFixed(2),
      cost_price: (Math.random() * 50 + 5).toFixed(2),
      category: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'][Math.floor(Math.random() * 5)],
      reorder_point: Math.floor(Math.random() * 20) + 1,
      max_stock_level: Math.floor(Math.random() * 200) + 100,
      item_type: ['Inventory', 'NonInventory', 'Service'][Math.floor(Math.random() * 3)],
      status: ['active', 'inactive', 'discontinued'][Math.floor(Math.random() * 3)],
      is_taxable: Math.random() > 0.2 ? 'true' : 'false', // 80% taxable
      weight: (Math.random() * 10 + 0.1).toFixed(2),
      dimensions_length: (Math.random() * 50 + 1).toFixed(2),
      dimensions_width: (Math.random() * 30 + 1).toFixed(2),
      dimensions_height: (Math.random() * 20 + 1).toFixed(2),
      location: `Warehouse ${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
      bin_location: `A${Math.floor(Math.random() * 10) + 1}-${Math.floor(Math.random() * 20) + 1}`
    });
  }

  // Error rows (5 out of 50)
  const errorRows = [
    // Row 46: Missing required name
    {
      sku: 'SKU-046',
      name: '', // Missing required field
      barcode: generateValidBarcode(),
      description: 'Missing name',
      quantity_on_hand: 10,
      unit_price: '25.99',
      cost_price: '12.50',
      category: 'Electronics',
      reorder_point: 5,
      max_stock_level: 100,
      item_type: 'Inventory',
      status: 'active',
      is_taxable: 'true',
      weight: '2.5',
      dimensions_length: '10.0',
      dimensions_width: '5.0',
      dimensions_height: '3.0',
      location: 'Warehouse A',
      bin_location: 'A1-5'
    },
    // Row 47: Invalid price format
    {
      sku: 'SKU-047',
      name: 'Invalid Price Product',
      barcode: generateValidBarcode(),
      description: 'Invalid price format',
      quantity_on_hand: 20,
      unit_price: 'invalid_price', // Invalid format
      cost_price: '10.50',
      category: 'Books',
      reorder_point: 8,
      max_stock_level: 150,
      item_type: 'Inventory',
      status: 'active',
      is_taxable: 'false',
      weight: '1.2',
      dimensions_length: '8.5',
      dimensions_width: '5.5',
      dimensions_height: '1.0',
      location: 'Warehouse B',
      bin_location: 'B2-10'
    },
    // Row 48: Duplicate SKU
    {
      sku: 'SKU-001', // Duplicate of first valid row
      name: 'Duplicate SKU Product',
      barcode: generateValidBarcode(),
      description: 'Duplicate SKU',
      quantity_on_hand: 15,
      unit_price: '30.00',
      cost_price: '15.00',
      category: 'Home',
      reorder_point: 4,
      max_stock_level: 80,
      item_type: 'Inventory',
      status: 'active',
      is_taxable: 'true',
      weight: '5.0',
      dimensions_length: '20.0',
      dimensions_width: '15.0',
      dimensions_height: '10.0',
      location: 'Warehouse C',
      bin_location: 'C3-15'
    },
    // Row 49: Decimal reorder point
    {
      sku: 'SKU-049',
      name: 'Decimal Reorder Product',
      barcode: generateValidBarcode(),
      description: 'Decimal reorder point',
      quantity_on_hand: 25,
      unit_price: '45.99',
      cost_price: '22.50',
      category: 'Sports',
      reorder_point: 2.5, // Should be integer
      max_stock_level: 200,
      item_type: 'Inventory',
      status: 'active',
      is_taxable: 'true',
      weight: '3.5',
      dimensions_length: '12.0',
      dimensions_width: '8.0',
      dimensions_height: '4.0',
      location: 'Warehouse A',
      bin_location: 'A5-20'
    },
    // Row 50: Multiple errors
    {
      sku: '', // Missing SKU
      name: '', // Missing name
      barcode: generateValidBarcode(),
      description: 'Multiple errors',
      quantity_on_hand: 10,
      unit_price: 'not_a_number', // Invalid
      cost_price: '15.75',
      category: 'Electronics',
      reorder_point: -2, // Negative
      max_stock_level: 'invalid', // Invalid
      item_type: 'InvalidType',
      status: 'InvalidStatus',
      is_active: 'maybe', // Invalid boolean
      is_taxable: 'yes',
      weight: 'heavy', // Invalid number
      dimensions_length: 'long',
      dimensions_width: 'wide',
      dimensions_height: 'tall',
      location: 'Warehouse D',
      bin_location: 'D1-1'
    }
  ];

  return [...demoRows, ...errorRows];
};

// Download CSV file
export const downloadCSV = (data: any[], filename: string) => {
  const csv = Papa.unparse(data, { header: true });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Download just the header template based on INVENTORY_FIELDS (ensures description is present)
export const downloadInventoryTemplate = () => {
  const csv = Papa.unparse({ fields: [...INVENTORY_FIELDS], data: [] as any[] });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inventory_template.csv';
  a.click();
  URL.revokeObjectURL(url);
};

// Build and download a comprehensive demo CSV (50 rows, includes description)
export const downloadDemoInventoryCsv = () => {
  const rows = generateDemoData();
  const fields = [...INVENTORY_FIELDS] as string[];
  const dataMatrix = rows.map((row: any) => fields.map((f) => (row as any)[f] ?? ''));
  const csv = Papa.unparse({ fields, data: dataMatrix });

  try {
    console.groupCollapsed('Demo Inventory CSV (preview)');
    console.log(csv.split('\n').slice(0, 10).join('\n'));
    console.groupEnd();
    console.groupCollapsed('Demo Inventory CSV (full)');
    console.log(csv);
    console.groupEnd();
  } catch {}

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory_demo_data_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Comprehensive unique inventory item generator
export interface UniqueItemOptions {
  itemType?: 'Inventory' | 'NonInventory' | 'Service';
  category?: string;
  priceRange?: { min: number; max: number };
  quantityRange?: { min: number; max: number };
  includePhysical?: boolean;
  includeLocation?: boolean;
  customPrefix?: string;
}

export const generateUniqueInventoryItem = (options: UniqueItemOptions = {}): any => {
  const {
    itemType = getRandomValue(['Inventory', 'NonInventory', 'Service']),
    category = getRandomValue([
      'Electronics',
      'Office Supplies',
      'Furniture',
      'Software',
      'Hardware',
      'Accessories',
      'Tools',
      'Materials',
      'Other'
    ]),
    priceRange = { min: 10, max: 1000 },
    quantityRange = { min: 1, max: 100 },
    includePhysical = true,
    includeLocation = true,
    customPrefix = 'ITEM'
  } = options;

  // Generate unique identifiers
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const uniqueId = `${customPrefix}-${timestamp}-${randomSuffix}`;

  // Product name generators by category
  const productNames = {
    Electronics: [
      'Wireless Headphones',
      'Smart Watch',
      'Bluetooth Speaker',
      'USB Cable',
      'Power Bank',
      'LED Monitor',
      'Webcam',
      'Wireless Mouse',
      'Mechanical Keyboard',
      'Tablet Stand'
    ],
    'Office Supplies': [
      'Ballpoint Pen',
      'Stapler',
      'File Folder',
      'Sticky Notes',
      'Desk Organizer',
      'Paper Clips',
      'Highlighters',
      'Notebook',
      'Whiteboard',
      'Calculator'
    ],
    Furniture: [
      'Office Chair',
      'Desk Lamp',
      'Bookshelf',
      'Filing Cabinet',
      'Monitor Stand',
      'Footrest',
      'Desk Mat',
      'Storage Box',
      'Whiteboard',
      'Plant Stand'
    ],
    Software: [
      'Project Management Tool',
      'Design Software',
      'Database License',
      'Security Suite',
      'Analytics Platform',
      'Communication Tool',
      'Backup Solution',
      'Development IDE',
      'Testing Framework',
      'Documentation System'
    ],
    Hardware: [
      'Screwdriver Set',
      'Drill Bit',
      'Measuring Tape',
      'Level Tool',
      'Hammer',
      'Pliers',
      'Wrench Set',
      'Safety Glasses',
      'Work Gloves',
      'Toolbox'
    ],
    Accessories: [
      'Phone Case',
      'Laptop Sleeve',
      'Screen Protector',
      'Charging Dock',
      'Cable Organizer',
      'Desk Pad',
      'Wrist Rest',
      'Monitor Arm',
      'Laptop Stand',
      'Webcam Cover'
    ],
    Tools: [
      'Digital Multimeter',
      'Soldering Iron',
      'Wire Strippers',
      'Crimping Tool',
      'Heat Gun',
      'Oscilloscope',
      'Logic Analyzer',
      'Function Generator',
      'Power Supply',
      'Breadboard'
    ],
    Materials: [
      'Aluminum Sheet',
      'Steel Rod',
      'Copper Wire',
      'Plastic Tubing',
      'Rubber Gasket',
      'Insulation Foam',
      'Acrylic Panel',
      'Carbon Fiber',
      'Ceramic Tile',
      'Wood Plank'
    ],
    Other: [
      'Cleaning Kit',
      'First Aid Kit',
      'Emergency Light',
      'Fire Extinguisher',
      'Safety Sign',
      'Warning Tape',
      'Protective Cover',
      'Maintenance Kit',
      'Replacement Part',
      'Upgrade Kit'
    ]
  };

  // Generate random values
  const productName = getRandomValue(productNames[category as keyof typeof productNames] || productNames.Other);
  const brand = getRandomValue([
    'TechCorp',
    'OfficePro',
    'HomeMax',
    'ProTools',
    'SmartGear',
    'EcoLine',
    'Premium',
    'Standard',
    'Elite',
    'Basic'
  ]);
  const model = `${brand}-${Math.floor(Math.random() * 9999) + 1000}`;
  const fullName = `${brand} ${productName} ${model}`;

  const unitPrice = (Math.random() * (priceRange.max - priceRange.min) + priceRange.min).toFixed(2);
  const costPrice = (parseFloat(unitPrice) * (0.4 + Math.random() * 0.4)).toFixed(2); // 40-80% of unit price
  const quantity = Math.floor(Math.random() * (quantityRange.max - quantityRange.min + 1)) + quantityRange.min;
  const reorderPoint = Math.floor(quantity * (0.1 + Math.random() * 0.3)); // 10-40% of quantity
  const maxStockLevel = Math.floor(quantity * (1.5 + Math.random() * 1)); // 150-250% of quantity

  // Generate valid barcode (EAN-13 / UPC-A / EAN-8)
  const barcode = generateValidBarcode();

  // Generate descriptions
  const descriptions = {
    Inventory: `High-quality ${productName.toLowerCase()} from ${brand}. Features premium materials and reliable performance. Perfect for professional use.`,
    NonInventory: `${productName} - A versatile ${category.toLowerCase()} item designed for efficiency and durability. Ideal for various applications.`,
    Service: `${productName} service - Professional ${category.toLowerCase()} support and maintenance. Expert solutions for your business needs.`
  };

  const description = descriptions[itemType as keyof typeof descriptions] || descriptions.Inventory;

  // Physical properties (only for Inventory and NonInventory)
  const weight = includePhysical && itemType !== 'Service' ? (Math.random() * 50 + 0.1).toFixed(2) : 0;
  const dimensions =
    includePhysical && itemType !== 'Service'
      ? {
          length: (Math.random() * 30 + 1).toFixed(1),
          width: (Math.random() * 20 + 1).toFixed(1),
          height: (Math.random() * 15 + 1).toFixed(1)
        }
      : { length: 0, width: 0, height: 0 };

  // Location properties
  const locations = ['Warehouse A', 'Warehouse B', 'Store Front', 'Back Room', 'Storage Room', 'Main Floor', 'Basement', 'Upper Level'];
  const binLocations = ['A1-5', 'B2-10', 'C3-15', 'D4-20', 'E5-25', 'F6-30', 'G7-35', 'H8-40'];

  const location = includeLocation ? getRandomValue(locations) : '';
  const binLocation = includeLocation && itemType === 'Inventory' ? getRandomValue(binLocations) : '';

  // Tax status (70% taxable, 30% non-taxable)
  const isTaxable = Math.random() < 0.7;

  // Status (90% active, 8% inactive, 2% discontinued)
  const statusRand = Math.random();
  const status = statusRand < 0.9 ? 'active' : statusRand < 0.98 ? 'inactive' : 'discontinued';

  return {
    sku: uniqueId,
    name: fullName,
    barcode: barcode,
    description: description,
    quantity_on_hand: itemType === 'Inventory' ? quantity : 0,
    unit_price: parseFloat(unitPrice),
    cost_price: parseFloat(costPrice),
    category: category,
    reorder_point: itemType === 'Inventory' ? reorderPoint : 0,
    max_stock_level: itemType === 'Inventory' ? maxStockLevel : 0,
    item_type: itemType,
    status: status,
    is_taxable: isTaxable,
    weight: parseFloat(weight.toString()),
    dimensions_length: parseFloat(dimensions.length.toString()),
    dimensions_width: parseFloat(dimensions.width.toString()),
    dimensions_height: parseFloat(dimensions.height.toString()),
    location: location,
    bin_location: binLocation
  };
};

// Helper function to get random value from array
const getRandomValue = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// -----------------------------
// Valid EAN/UPC barcode helpers
// -----------------------------
const randomDigits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10));

const ean13Checksum = (d12: number[]): number => {
  const sum = d12.reduce((acc, d, idx) => acc + d * (idx % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
};

const upcAChecksum = (d11: number[]): number => {
  const sumOdd = d11.reduce((acc, d, idx) => acc + (idx % 2 === 0 ? d : 0), 0);
  const sumEven = d11.reduce((acc, d, idx) => acc + (idx % 2 === 1 ? d : 0), 0);
  const total = sumOdd * 3 + sumEven;
  return (10 - (total % 10)) % 10;
};

const ean8Checksum = (d7: number[]): number => {
  const sum = d7.reduce((acc, d, idx) => acc + d * (idx % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
};

export const generateEAN13 = (): string => {
  const d12 = randomDigits(12);
  const c = ean13Checksum(d12);
  return [...d12, c].join('');
};

export const generateUPCA = (): string => {
  const d11 = randomDigits(11);
  const c = upcAChecksum(d11);
  return [...d11, c].join('');
};

export const generateEAN8 = (): string => {
  const d7 = randomDigits(7);
  const c = ean8Checksum(d7);
  return [...d7, c].join('');
};

export const generateValidBarcode = (): string => {
  const r = Math.random();
  if (r < 0.5) return generateEAN13();
  if (r < 0.8) return generateUPCA();
  return generateEAN8();
};

// Generate multiple unique items
export const generateUniqueInventoryItems = (count: number, options: UniqueItemOptions = {}): any[] => {
  const items: any[] = [];
  const usedSkus = new Set<string>();
  const usedBarcodes = new Set<string>();

  for (let i = 0; i < count; i++) {
    let item;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop

    do {
      item = generateUniqueInventoryItem(options);
      attempts++;
    } while ((usedSkus.has(item.sku) || usedBarcodes.has(item.barcode)) && attempts < maxAttempts);

    if (attempts < maxAttempts) {
      usedSkus.add(item.sku);
      usedBarcodes.add(item.barcode);
      items.push(item);
    } else {
      console.warn(`Failed to generate unique item after ${maxAttempts} attempts`);
      // Force uniqueness by adding timestamp
      item.sku = `${item.sku}-${Date.now()}-${i}`;
      item.barcode = `${item.barcode}${i}`;
      items.push(item);
    }
  }

  return items;
};

// Generate items with specific distribution
export const generateInventoryItemsWithDistribution = (options: {
  totalItems: number;
  itemTypeDistribution?: { Inventory: number; NonInventory: number; Service: number };
  categoryDistribution?: Record<string, number>;
  priceRangeDistribution?: { low: number; medium: number; high: number }; // counts for each range
}): any[] => {
  const {
    totalItems,
    itemTypeDistribution = { Inventory: 60, NonInventory: 30, Service: 10 },
    categoryDistribution = {},
    priceRangeDistribution = { low: 40, medium: 35, high: 25 }
  } = options;

  const items: any[] = [];

  // Generate items by type distribution
  Object.entries(itemTypeDistribution).forEach(([type, count]) => {
    for (let i = 0; i < count && items.length < totalItems; i++) {
      const itemOptions: UniqueItemOptions = {
        itemType: type as 'Inventory' | 'NonInventory' | 'Service'
      };

      // Apply category distribution if specified
      if (Object.keys(categoryDistribution).length > 0) {
        const categories = Object.keys(categoryDistribution);
        const weights = Object.values(categoryDistribution);
        itemOptions.category = weightedRandomSelection(categories, weights);
      }

      // Apply price range distribution
      const priceRanges = [
        { min: 1, max: 50 }, // Low
        { min: 51, max: 200 }, // Medium
        { min: 201, max: 1000 } // High
      ];
      const ranges = ['low', 'medium', 'high'];
      const rangeWeights = [priceRangeDistribution.low, priceRangeDistribution.medium, priceRangeDistribution.high];
      const selectedRange = weightedRandomSelection(ranges, rangeWeights);
      const rangeIndex = ranges.indexOf(selectedRange);
      itemOptions.priceRange = priceRanges[rangeIndex];

      items.push(generateUniqueInventoryItem(itemOptions));
    }
  });

  // Fill remaining items with random generation
  while (items.length < totalItems) {
    items.push(generateUniqueInventoryItem());
  }

  return items;
};

// Helper function for weighted random selection
const weightedRandomSelection = (items: string[], weights: number[]): string => {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
};

// ============================================================================
// INVENTORY GENERATOR EXAMPLES
// ============================================================================

// Example 1: Generate a single unique item with default settings
export const createSingleItem = () => {
  const item = generateUniqueInventoryItem();
  console.log('Single Item:', item);
  return item;
};

// Example 2: Generate a single item with specific options
export const createCustomItem = () => {
  const options: UniqueItemOptions = {
    itemType: 'Inventory',
    category: 'Electronics',
    priceRange: { min: 100, max: 500 },
    quantityRange: { min: 10, max: 50 },
    customPrefix: 'CUSTOM'
  };

  const item = generateUniqueInventoryItem(options);
  console.log('Custom Item:', item);
  return item;
};

// Example 3: Generate multiple unique items
export const createMultipleItems = () => {
  const items = generateUniqueInventoryItems(5, {
    itemType: 'Inventory',
    category: 'Office Supplies'
  });

  console.log('Multiple Items:', items);
  return items;
};

// Example 4: Generate items with specific distribution
export const createDistributedItems = () => {
  const items = generateInventoryItemsWithDistribution({
    totalItems: 20,
    itemTypeDistribution: {
      Inventory: 12, // 60%
      NonInventory: 6, // 30%
      Service: 2 // 10%
    },
    categoryDistribution: {
      Electronics: 5,
      'Office Supplies': 8,
      Furniture: 4,
      Software: 3
    },
    priceRangeDistribution: {
      low: 8, // $1-$50
      medium: 7, // $51-$200
      high: 5 // $201-$1000
    }
  });

  console.log('Distributed Items:', items);
  return items;
};

// Example 5: Generate service items only
export const createServiceItems = () => {
  const items = generateUniqueInventoryItems(3, {
    itemType: 'Service',
    category: 'Software',
    includePhysical: false,
    includeLocation: false
  });

  console.log('Service Items:', items);
  return items;
};

// Example 6: Generate high-value inventory items
export const createHighValueItems = () => {
  const items = generateUniqueInventoryItems(5, {
    itemType: 'Inventory',
    priceRange: { min: 500, max: 2000 },
    quantityRange: { min: 1, max: 10 },
    customPrefix: 'PREMIUM'
  });

  console.log('High Value Items:', items);
  return items;
};

// Example 7: Generate items for testing low stock scenarios
export const createLowStockItems = () => {
  const items = generateUniqueInventoryItems(3, {
    itemType: 'Inventory',
    quantityRange: { min: 1, max: 5 },
    customPrefix: 'LOWSTOCK'
  });

  console.log('Low Stock Items:', items);
  return items;
};

// Example 8: Generate mixed items with random distribution
export const createMixedItems = () => {
  const items = generateInventoryItemsWithDistribution({
    totalItems: 15,
    itemTypeDistribution: {
      Inventory: 10,
      NonInventory: 3,
      Service: 2
    }
  });

  console.log('Mixed Items:', items);
  return items;
};

// Usage examples (commented out):
// createSingleItem();
// createCustomItem();
// createMultipleItems();
// createDistributedItems();
// createServiceItems();
// createHighValueItems();
// createLowStockItems();
// createMixedItems();
