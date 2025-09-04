// Simplified CSV Import Modal with MUI Stepper - User-Friendly and Robust
import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import { CloudUpload, Close, Refresh, Visibility } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { CSVRow, ImportSummary } from 'types/employee';
import { csvImportService } from 'api/employee.api';
import { useDispatch, useSelector } from 'store';
import { fetchEmployees } from 'store/slices/employee';

interface EmployeeCSVImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: (newEmployees: any[]) => void;
}

// Simple field mapping interface
interface SimpleFieldMapping {
  csvColumn: string;
  systemField: keyof CSVRow;
}

export const EmployeeCSVImportModal: React.FC<EmployeeCSVImportModalProps> = ({ open, onClose, onImportComplete }) => {
  const dispatch = useDispatch();
  const { currentRole } = useSelector((state) => state.auth);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<SimpleFieldMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showDataPreview, setShowDataPreview] = useState(false);

  // Define steps for the stepper
  const steps = [
    {
      label: 'Upload CSV File'
    },
    {
      label: 'Map CSV Columns'
    },
    {
      label: 'Review & Import'
    },
    {
      label: 'Complete'
    }
  ];

  // Simple CSV parsing with PapaParse
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];

    // Basic file validation
    if (!file.name.endsWith('.csv')) {
      setValidationErrors(['Please select a CSV file']);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setValidationErrors(['File size must be less than 10MB']);
      return;
    }

    try {
      setValidationErrors([]);

      // Parse CSV with PapaParse - handle quoted fields and commas in addresses
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false, // Keep everything as strings
        transform: (value) => value?.trim() || '', // Trim whitespace
        complete: (results) => {
          if (results.errors.length > 0) {
            // Show warnings but don't block
            console.warn('CSV parsing warnings:', results.errors);

            // Check for common CSV issues
            const hasCommaIssues = results.errors.some(
              (error) => error.message.includes('Too many fields') || error.message.includes('Too few fields')
            );

            if (hasCommaIssues) {
              console.warn('CSV may have comma issues in fields like addresses. Ensure fields with commas are properly quoted.');
            }
          }

          const headers = results.meta.fields || [];
          setCsvHeaders(headers);

          // Parse data rows
          const rows = results.data as any[];
          setCsvData(rows);

          // Simple auto-mapping for common field names
          const autoMappings: SimpleFieldMapping[] = [];

          headers.forEach((header) => {
            const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
            let mappedField: keyof CSVRow | null = null;

            // Basic field matching - no confusion
            if (lowerHeader === 'firstname' || lowerHeader === 'first_name' || lowerHeader === 'first') {
              mappedField = 'first_name';
            } else if (lowerHeader === 'lastname' || lowerHeader === 'last_name' || lowerHeader === 'last') {
              mappedField = 'last_name';
            } else if (lowerHeader === 'email') {
              mappedField = 'email';
            } else if (lowerHeader === 'phone' || lowerHeader === 'tel') {
              mappedField = 'phone';
            } else if (lowerHeader === 'title' || lowerHeader === 'position') {
              mappedField = 'title';
            } else if (lowerHeader === 'address') {
              mappedField = 'address';
            } else if (lowerHeader === 'status') {
              mappedField = 'status';
            }

            if (mappedField) {
              autoMappings.push({
                csvColumn: header,
                systemField: mappedField
              });
            }
          });

          setFieldMappings(autoMappings);

          // Move to next step
          handleNext();
        },
        error: (error) => {
          setValidationErrors([`CSV parsing failed: ${error.message}`]);
        }
      });
    } catch (error: any) {
      setValidationErrors([error.message || 'Failed to parse CSV file']);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  // Handle field mapping changes
  const handleMappingChange = (csvColumn: string, systemField: string) => {
    const newMappings = fieldMappings.filter((m) => m.systemField !== systemField);
    newMappings.push({ csvColumn, systemField: systemField as keyof CSVRow });
    setFieldMappings(newMappings);
  };

  // Add new field mapping
  const addFieldMapping = () => {
    if (csvHeaders.length > 0) {
      const unusedHeaders = csvHeaders.filter((header) => !fieldMappings.some((m) => m.csvColumn === header));

      if (unusedHeaders.length > 0) {
        const newMapping: SimpleFieldMapping = {
          csvColumn: unusedHeaders[0],
          systemField: 'first_name' // Default mapping
        };
        setFieldMappings([...fieldMappings, newMapping]);
      }
    }
  };

  // Remove field mapping
  const removeFieldMapping = (csvColumn: string) => {
    setFieldMappings(fieldMappings.filter((m) => m.csvColumn !== csvColumn));
  };

  // Clear field mapping (set back to unmapped)
  const clearFieldMapping = (systemField: string) => {
    setFieldMappings(fieldMappings.filter((m) => m.systemField !== systemField));
  };

  // Validate and proceed to import
  const handleProceedToImport = () => {
    const errors: string[] = [];

    // Check required fields
    const requiredFields = ['first_name', 'last_name', 'email'];
    const missingFields = requiredFields.filter((field) => !fieldMappings.some((m) => m.systemField === field));

    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.map((f) => f.replace('_', ' ')).join(', ')}`);
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);

    // Transform CSV data based on mappings
    const transformedData = csvData.map((row) => {
      const transformed: any = {};
      fieldMappings.forEach((mapping) => {
        const value = (row as any)[mapping.csvColumn];
        if (value !== undefined && value !== '') {
          transformed[mapping.systemField] = value;
        }
      });

      // Set defaults for missing fields
      if (!transformed.status) transformed.status = 'active';
      if (!transformed.is_active) transformed.is_active = true;

      return transformed as CSVRow;
    });

    setCsvData(transformedData);
    handleNext();
  };

  // Handle import process
  const handleImport = async () => {
    if (csvData.length === 0) return;

    setIsImporting(true);

    try {
      if (!currentRole?.company_id) {
        throw new Error('No company selected');
      }
      const summary = await csvImportService.importEmployees(csvData, currentRole.company_id);
      setImportSummary(summary);
      handleNext();

      // Refresh the employee list to show newly imported employees
      dispatch(fetchEmployees());

      // Note: onImportComplete will be called when user manually closes the modal
    } catch (error: any) {
      setValidationErrors([error.message || 'Import failed']);
    } finally {
      setIsImporting(false);
    }
  };

  // Validate CSV format for common issues
  const validateCSVFormat = (csvText: string): { isValid: boolean; issues: string[] } => {
    const issues: string[] = [];
    const lines = csvText.split('\n');

    if (lines.length < 2) {
      issues.push('CSV must have at least a header row and one data row');
      return { isValid: false, issues };
    }

    const headerFields = lines[0].split(',').length;

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const fields = lines[i].split(',').length;
        if (fields !== headerFields) {
          issues.push(
            `Row ${i + 1} has ${fields} fields but header has ${headerFields} fields. This often happens when addresses contain unquoted commas.`
          );
        }
      }
    }

    return { isValid: issues.length === 0, issues };
  };

  // Generate unique demo CSV data
  const generateDemoCSV = () => {
    const firstNames = [
      'Emma',
      'Liam',
      'Olivia',
      'Noah',
      'Ava',
      'Ethan',
      'Isabella',
      'Lucas',
      'Sophia',
      'Mason',
      'Mia',
      'Oliver',
      'Charlotte',
      'Elijah',
      'Amelia',
      'James',
      'Harper',
      'Benjamin',
      'Evelyn',
      'Sebastian',
      'Abigail',
      'Michael',
      'Emily',
      'Daniel',
      'Elizabeth',
      'Henry',
      'Sofia',
      'Jackson',
      'Avery',
      'Samuel',
      'Ella',
      'David',
      'Madison',
      'Joseph',
      'Scarlett',
      'Carter',
      'Victoria',
      'Owen',
      'Luna',
      'Wyatt',
      'Grace',
      'John',
      'Chloe',
      'Jack',
      'Camila',
      'Luke',
      'Penelope',
      'Jayden',
      'Layla',
      'Dylan'
    ];

    const lastNames = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
      'Rodriguez',
      'Martinez',
      'Hernandez',
      'Lopez',
      'Gonzalez',
      'Wilson',
      'Anderson',
      'Thomas',
      'Taylor',
      'Moore',
      'Jackson',
      'Martin',
      'Lee',
      'Perez',
      'Thompson',
      'White',
      'Harris',
      'Sanchez',
      'Clark',
      'Ramirez',
      'Lewis',
      'Robinson',
      'Walker',
      'Young',
      'Allen',
      'King',
      'Wright',
      'Scott',
      'Torres',
      'Nguyen',
      'Hill',
      'Flores',
      'Green',
      'Adams',
      'Nelson',
      'Baker',
      'Hall',
      'Rivera',
      'Campbell',
      'Mitchell',
      'Carter',
      'Roberts'
    ];

    const jobTitles = [
      'Software Engineer',
      'Product Manager',
      'Data Analyst',
      'UX Designer',
      'Marketing Specialist',
      'Sales Representative',
      'HR Coordinator',
      'Financial Analyst',
      'Operations Manager',
      'Customer Success Manager',
      'Business Analyst',
      'Project Manager',
      'Content Writer',
      'Graphic Designer',
      'DevOps Engineer',
      'Quality Assurance Engineer',
      'Business Development Manager',
      'Product Marketing Manager',
      'Data Scientist',
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'UI Designer',
      'Technical Writer',
      'Scrum Master',
      'Agile Coach',
      'Solution Architect',
      'System Administrator',
      'Network Engineer',
      'Security Engineer',
      'Cloud Engineer',
      'Machine Learning Engineer',
      'AI Specialist',
      'Blockchain Developer'
    ];

    const domains = [
      'techcorp.com',
      'innovate.io',
      'digitalflow.net',
      'futuretech.com',
      'smartworks.org',
      'nextgen.tech',
      'modernsolutions.com',
      'agilecorp.net',
      'techpulse.io',
      'innovatehub.com'
    ];

    const phoneFormats = ['+1-555-{xxx}-{xxxx}', '+1-{xxx}-555-{xxxx}', '+1-{xxx}-{xxx}-5555', '({xxx}) 555-{xxxx}', '555-{xxx}-{xxxx}'];

    // Generate 20 unique random employees with only essential fields
    const employees = [];
    const usedEmails = new Set();
    const usedNames = new Set();

    for (let i = 0; i < 20; i++) {
      let firstName, lastName, fullName, email;

      // Ensure unique names and emails
      do {
        firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        fullName = `${firstName} ${lastName}`;
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domains[Math.floor(Math.random() * domains.length)]}`;
      } while (usedNames.has(fullName) || usedEmails.has(email));

      usedNames.add(fullName);
      usedEmails.add(email);

      const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)];

      // Generate unique phone number
      const phoneFormat = phoneFormats[Math.floor(Math.random() * phoneFormats.length)];
      const phone = phoneFormat
        .replace(/{xxx}/g, () => Math.floor(Math.random() * 900 + 100).toString())
        .replace(/{xxxx}/g, () => Math.floor(Math.random() * 9000 + 1000).toString());

      employees.push({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        title: jobTitle,
        address: `${Math.floor(Math.random() * 9999) + 1} Main St, City, ST`,
        status: Math.random() > 0.1 ? 'active' : 'inactive'
      });
    }

    // Create CSV content
    // Helper function to properly escape CSV fields
    const escapeCSVField = (field: string): string => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        // Escape quotes and wrap in quotes
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvContent = [
      'first_name,last_name,email,phone,title,address,status',
      ...employees.map((emp) => {
        return [
          escapeCSVField(emp.first_name),
          escapeCSVField(emp.last_name),
          escapeCSVField(emp.email),
          escapeCSVField(emp.phone || ''),
          escapeCSVField(emp.title || ''),
          escapeCSVField(emp.address || ''),
          escapeCSVField(emp.status || 'active')
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demo_employees_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Stepper navigation
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setCsvData([]);
    setCsvHeaders([]);
    setFieldMappings([]);
    setValidationErrors([]);
    setImportSummary(null);
    setIsImporting(false);
    setShowDataPreview(false);
  };

  const handleRetry = () => {
    handleReset();
  };

  const handleClose = () => {
    // If we have import results, call the callback with successful employees
    if (importSummary) {
      const successfulEmployees = importSummary.results
        .filter((result) => result.success && result.employee)
        .map((result) => result.employee!);
      onImportComplete(successfulEmployees);
    }

    handleReset();
    onClose();
  };

  // State for custom field mapping
  const [customFieldToAdd, setCustomFieldToAdd] = useState<keyof CSVRow | ''>('');
  const [customCsvColumnToAdd, setCustomCsvColumnToAdd] = useState<string | ''>('');

  // Add custom field mapping
  const addCustomFieldMapping = () => {
    if (customFieldToAdd && customCsvColumnToAdd) {
      const newMapping: SimpleFieldMapping = {
        csvColumn: customCsvColumnToAdd,
        systemField: customFieldToAdd
      };
      setFieldMappings([...fieldMappings, newMapping]);
      setCustomFieldToAdd('');
      setCustomCsvColumnToAdd('');
    }
  };

  // Render upload step content
  const renderUploadStepContent = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>CSV Format:</strong> Required: first_name, last_name, email. Optional: phone, title, address, status. Status defaults to
          'active' if not provided.
        </Typography>
      </Alert>

      <Box sx={{ mb: 3 }}>
        <Button variant="outlined" size="small" onClick={generateDemoCSV}>
          Download Demo Data
        </Button>
      </Box>

      <Paper
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file here'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          or click to select a file
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Supported: CSV files up to 10MB
        </Typography>
      </Paper>

      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {validationErrors.map((error, index) => (
            <Typography key={index} variant="body2">
              {error}
            </Typography>
          ))}
        </Alert>
      )}
    </Box>
  );

  // Render mapping step content
  const renderMappingStepContent = () => (
    <Box>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Match each CSV column header to the corresponding employee field. You can change any mapping at any time - all fields are editable
        dropdowns.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Mapping:</strong> All fields are editable dropdowns. You can change mappings, clear them, or add new ones.
        </Typography>
      </Alert>

      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationErrors.map((error, index) => (
            <Typography key={index} variant="body2">
              {error}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Field Mappings - Required Fields First */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          Required Fields (Must be mapped)
        </Typography>
        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="40%">System Field</TableCell>
                <TableCell width="40%">CSV Column</TableCell>
                <TableCell width="20%">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {['first_name', 'last_name', 'email'].map((field) => {
                const mapping = fieldMappings.find((m) => m.systemField === field);
                return (
                  <TableRow key={field}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {field === 'first_name'
                          ? 'FIRST NAME'
                          : field === 'last_name'
                            ? 'LAST NAME'
                            : field.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {field === 'first_name'
                          ? 'Given name (e.g., John, Jane, Michael)'
                          : field === 'last_name'
                            ? 'Family name (e.g., Doe, Smith, Johnson)'
                            : field === 'email'
                              ? 'Email address (e.g., john@company.com)'
                              : field === 'phone'
                                ? 'Phone number (e.g., +1-555-1234)'
                                : field === 'title'
                                  ? 'Job title (e.g., Software Engineer)'
                                  : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={mapping?.csvColumn || ''}
                          onChange={(e) => handleMappingChange(e.target.value as string, field)}
                          displayEmpty
                        >
                          <MenuItem value="" disabled>
                            Select CSV column
                          </MenuItem>
                          {csvHeaders.map((header) => (
                            <MenuItem key={header} value={header}>
                              {header}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      {mapping ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label="Mapped" color="success" size="small" />
                          <IconButton size="small" onClick={() => clearFieldMapping(field)} color="warning" title="Clear mapping">
                            <Close fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Chip label="Required" color="error" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Field Mappings - Optional Fields */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          Optional Fields (Can be mapped if available)
        </Typography>
        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="40%">System Field</TableCell>
                <TableCell width="40%">CSV Column</TableCell>
                <TableCell width="20%">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {['phone', 'title', 'address', 'status'].map((field) => {
                const mapping = fieldMappings.find((m) => m.systemField === field);
                return (
                  <TableRow key={field}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {field.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {field === 'phone'
                          ? 'Phone number (e.g., +1-555-1234)'
                          : field === 'title'
                            ? 'Job title (e.g., Software Engineer)'
                            : field === 'address'
                              ? 'Address (e.g., 123 Main St, City, State)'
                              : field === 'status'
                                ? 'Status (active/inactive, defaults to active)'
                                : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={mapping?.csvColumn || ''}
                          onChange={(e) => handleMappingChange(e.target.value as string, field)}
                          displayEmpty
                        >
                          <MenuItem value="" disabled>
                            Select CSV column
                          </MenuItem>
                          {csvHeaders.map((header) => (
                            <MenuItem key={header} value={header}>
                              {header}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      {mapping ? (
                        <Chip label="Mapped" color="success" size="small" />
                      ) : (
                        <Chip label="Optional" color="default" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Data Preview */}
      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">Data Preview (First 3 rows):</Typography>
          <Button size="small" onClick={() => setShowDataPreview(!showDataPreview)} startIcon={<Visibility />}>
            {showDataPreview ? 'Hide' : 'Show'} Preview
          </Button>
        </Box>

        {showDataPreview && csvData.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  {csvHeaders.map((header) => (
                    <TableCell key={header}>{header}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {csvData.slice(0, 3).map((row, index) => (
                  <TableRow key={index}>
                    {csvHeaders.map((header) => (
                      <TableCell key={header}>
                        <Typography variant="caption">{(row as any)[header] || '-'}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );

  // Render review step content
  const renderReviewStepContent = () => (
    <Box>
      <Typography variant="body2" gutterBottom>
        Ready to import {csvData.length} employees with the following mapping:
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 2, mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>System Field</TableCell>
              <TableCell>CSV Column</TableCell>
              <TableCell>Sample Data</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fieldMappings.map((mapping) => (
              <TableRow key={mapping.systemField}>
                <TableCell>
                  <Typography variant="subtitle2">{mapping.systemField.replace('_', ' ').toUpperCase()}</Typography>
                </TableCell>
                <TableCell>{mapping.csvColumn}</TableCell>
                <TableCell>
                  <Typography variant="caption" color="textSecondary">
                    {csvData[0]?.[mapping.systemField] || 'No data'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {isImporting && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Importing {csvData.length} employees...
          </Typography>
          <LinearProgress />
          <Typography variant="caption" color="textSecondary">
            This may take a few moments. Please do not close this window.
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Render complete step content
  const renderCompleteStepContent = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Import Results
      </Typography>

      {importSummary && (
        <Box sx={{ mb: 3 }}>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {importSummary.total}
                </Typography>
                <Typography variant="body2">Total Rows</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                <Typography variant="h4" color="success.dark">
                  {importSummary.successful}
                </Typography>
                <Typography variant="body2">Successful</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light' }}>
                <Typography variant="h4" color="error.dark">
                  {importSummary.failed}
                </Typography>
                <Typography variant="body2">Failed</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Detailed Results Table */}
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            Row-by-Row Results
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 300, mb: 2 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Employee Name</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {importSummary.results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {result.row}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={result.success ? 'Success' : 'Failed'} color={result.success ? 'success' : 'error'} size="small" />
                    </TableCell>
                    <TableCell>
                      {result.success && result.employee ? (
                        <Typography variant="body2">
                          {result.employee.first_name} {result.employee.last_name}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          N/A
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.success ? (
                        <Typography variant="body2" color="success.main">
                          Employee created successfully
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="error.main">
                          {result.error || 'Unknown error'}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {importSummary.failed > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                {importSummary.failed} rows failed to import. Review the errors above and check your data.
              </Typography>
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );

  // Get step content based on active step
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderUploadStepContent();
      case 1:
        return renderMappingStepContent();
      case 2:
        return renderReviewStepContent();
      case 3:
        return renderCompleteStepContent();
      default:
        return renderUploadStepContent();
    }
  };

  // Get action buttons based on current step
  const getActionButtons = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={handleClose}>Cancel</Button>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handleBack}>Back</Button>
            <Button
              onClick={handleProceedToImport}
              variant="contained"
              disabled={fieldMappings.length === 0}
              sx={{
                bgcolor: '#2196F3',
                color: 'white',
                '&:hover': {
                  bgcolor: '#2196F3',
                  opacity: 0.9
                }
              }}
            >
              Continue to Review
            </Button>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handleBack}>Back</Button>
            <Button
              onClick={handleImport}
              variant="contained"
              disabled={csvData.length === 0 || isImporting}
              sx={{
                bgcolor: '#2196F3',
                color: 'white',
                '&:hover': {
                  bgcolor: '#2196F3',
                  opacity: 0.9
                }
              }}
            >
              {isImporting ? 'Importing...' : 'Start Import'}
            </Button>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handleRetry} startIcon={<Refresh />}>
              Import Another File
            </Button>
            <Button
              onClick={handleClose}
              variant="contained"
              sx={{
                bgcolor: '#2196F3',
                color: 'white',
                '&:hover': {
                  bgcolor: '#2196F3',
                  opacity: 0.9
                }
              }}
            >
              Close
            </Button>
          </Box>
        );

      default:
        return <Button onClick={handleClose}>Close</Button>;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">Import Employees from CSV</Typography>
            {currentRole?.company_name && (
              <Typography variant="caption" color="textSecondary">
                Company: {currentRole.company_name}
              </Typography>
            )}
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {step.label}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Box sx={{ mb: 2 }}>{getStepContent(index)}</Box>
                  {getActionButtons()}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
