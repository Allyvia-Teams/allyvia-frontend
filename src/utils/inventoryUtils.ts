import Papa from 'papaparse';

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
  'reorder_point'
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
          // Convert to integer, default to 0 if invalid
          backendRow[field] = isNaN(Number(value)) ? 0 : Math.floor(Number(value));
          break;
        case 'unit_price':
        case 'cost_price':
          // Convert to number with 2 decimal places, default to 0 if invalid
          backendRow[field] = isNaN(Number(value)) ? 0 : Number(Number(value).toFixed(2));
          break;
        case 'reorder_point':
          // Convert to integer, default to null if invalid or empty
          backendRow[field] = value && !isNaN(Number(value)) ? Math.floor(Number(value)) : null;
          break;
        case 'sku':
        case 'barcode':
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
    reorder_point: ''
  };

  csvHeaders.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim();

    // Direct matches
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

  // Valid rows (32 out of 50)
  for (let i = 1; i <= 32; i++) {
    demoRows.push({
      sku: `SKU-${String(i).padStart(3, '0')}`,
      name: `Product ${i}`,
      barcode: `123456789${String(i).padStart(3, '0')}`,
      description: `Description for Product ${i}`,
      quantity_on_hand: Math.floor(Math.random() * 100) + 1,
      unit_price: (Math.random() * 100 + 10).toFixed(2),
      cost_price: (Math.random() * 50 + 5).toFixed(2),
      category: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'][Math.floor(Math.random() * 5)],
      reorder_point: Math.floor(Math.random() * 20) + 1
    });
  }

  // Error rows (18 out of 50)
  const errorRows = [
    // Row 33: Missing required name
    {
      sku: 'SKU-033',
      name: '', // Missing required field
      barcode: '123456789033',
      description: 'Missing name',
      quantity_on_hand: 10,
      unit_price: '25.99',
      cost_price: '12.50',
      category: 'Electronics',
      reorder_point: 5
    },
    // Row 34: Negative quantity
    {
      sku: 'SKU-034',
      name: 'Negative Quantity Product',
      barcode: '123456789034',
      description: 'Has negative quantity',
      quantity_on_hand: -5, // Invalid negative
      unit_price: '15.99',
      cost_price: '8.00',
      category: 'Clothing',
      reorder_point: 3
    },
    // Row 35: Invalid price format
    {
      sku: 'SKU-035',
      name: 'Invalid Price Product',
      barcode: '123456789035',
      description: 'Invalid price format',
      quantity_on_hand: 20,
      unit_price: 'invalid_price', // Invalid format
      cost_price: '10.50',
      category: 'Books',
      reorder_point: 8
    },
    // Row 36: Duplicate SKU
    {
      sku: 'SKU-001', // Duplicate of first valid row
      name: 'Duplicate SKU Product',
      barcode: '123456789036',
      description: 'Duplicate SKU',
      quantity_on_hand: 15,
      unit_price: '30.00',
      cost_price: '15.00',
      category: 'Home',
      reorder_point: 4
    },
    // Row 37: Decimal reorder point
    {
      sku: 'SKU-037',
      name: 'Decimal Reorder Product',
      barcode: '123456789037',
      description: 'Decimal reorder point',
      quantity_on_hand: 25,
      unit_price: '45.99',
      cost_price: '22.50',
      category: 'Sports',
      reorder_point: 2.5 // Should be integer
    },
    // Row 38: Multiple errors
    {
      sku: '', // Missing SKU
      name: '', // Missing name
      barcode: '123456789038',
      description: 'Multiple errors',
      quantity_on_hand: -10, // Negative
      unit_price: 'not_a_number', // Invalid
      cost_price: '15.75',
      category: 'Electronics',
      reorder_point: -2 // Negative
    },
    // Row 39: Field too long
    {
      sku: 'SKU-039',
      name: 'A'.repeat(300), // Too long
      barcode: '123456789039',
      description: 'Field too long',
      quantity_on_hand: 30,
      unit_price: '60.00',
      cost_price: '30.00',
      category: 'Clothing',
      reorder_point: 10
    },
    // Row 40: Negative cost price
    {
      sku: 'SKU-040',
      name: 'Negative Cost Product',
      barcode: '123456789040',
      description: 'Negative cost price',
      quantity_on_hand: 12,
      unit_price: '25.00',
      cost_price: -5.0, // Negative cost
      category: 'Books',
      reorder_point: 6
    },
    // Row 41: Duplicate barcode
    {
      sku: 'SKU-041',
      name: 'Duplicate Barcode Product',
      barcode: '123456789001', // Duplicate of first valid row
      description: 'Duplicate barcode',
      quantity_on_hand: 18,
      unit_price: '35.50',
      cost_price: '17.75',
      category: 'Home',
      reorder_point: 7
    },
    // Row 42: Empty required fields
    {
      sku: '',
      name: '',
      barcode: '',
      description: 'All required fields empty',
      quantity_on_hand: 0,
      unit_price: '0.00',
      cost_price: '0.00',
      category: '',
      reorder_point: 0
    },
    // Row 43: Invalid category
    {
      sku: 'SKU-043',
      name: 'Invalid Category Product',
      barcode: '123456789043',
      description: 'Invalid category',
      quantity_on_hand: 22,
      unit_price: '40.00',
      cost_price: '20.00',
      category: 'InvalidCategory123!@#', // Invalid characters
      reorder_point: 9
    },
    // Row 44: Very large numbers
    {
      sku: 'SKU-044',
      name: 'Large Numbers Product',
      barcode: '123456789044',
      description: 'Very large numbers',
      quantity_on_hand: 999999999, // Very large
      unit_price: '999999.99', // Very large price
      cost_price: '999999.99',
      category: 'Electronics',
      reorder_point: 999999
    },
    // Row 45: Special characters in SKU
    {
      sku: 'SKU-045!@#$%', // Special characters
      name: 'Special Chars Product',
      barcode: '123456789045',
      description: 'Special characters in SKU',
      quantity_on_hand: 14,
      unit_price: '28.75',
      cost_price: '14.38',
      category: 'Clothing',
      reorder_point: 5
    },
    // Row 46: Whitespace only
    {
      sku: '   ', // Whitespace only
      name: '   ',
      barcode: '123456789046',
      description: 'Whitespace only fields',
      quantity_on_hand: 16,
      unit_price: '32.25',
      cost_price: '16.13',
      category: '   ',
      reorder_point: 6
    },
    // Row 47: Mixed data types
    {
      sku: 12345, // Number instead of string
      name: 'Mixed Types Product',
      barcode: 987654321047, // Number instead of string
      description: 'Mixed data types',
      quantity_on_hand: 'not_a_number', // String instead of number
      unit_price: true, // Boolean instead of number
      cost_price: '18.50',
      category: 'Books',
      reorder_point: 'five' // String instead of number
    },
    // Row 48: SQL injection attempt
    {
      sku: "SKU-048'; DROP TABLE inventory; --",
      name: "SQL Injection Product'; DROP TABLE inventory; --",
      barcode: '123456789048',
      description: 'SQL injection attempt',
      quantity_on_hand: 20,
      unit_price: '50.00',
      cost_price: '25.00',
      category: 'Home',
      reorder_point: 8
    },
    // Row 49: XSS attempt
    {
      sku: 'SKU-049',
      name: '<script>alert("XSS")</script>',
      barcode: '123456789049',
      description: '<img src="x" onerror="alert(\'XSS\')">',
      quantity_on_hand: 17,
      unit_price: '42.99',
      cost_price: '21.50',
      category: 'Sports',
      reorder_point: 7
    },
    // Row 50: Unicode and emoji
    {
      sku: 'SKU-050',
      name: 'Unicode Product 🚀',
      barcode: '123456789050',
      description: 'Unicode description with émojis 🎉',
      quantity_on_hand: 19,
      unit_price: '55.75',
      cost_price: '27.88',
      category: 'Electronics',
      reorder_point: 6
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
