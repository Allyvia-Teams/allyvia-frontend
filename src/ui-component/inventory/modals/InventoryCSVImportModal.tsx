// ui-component/inventory/InventoryCSVImportModal.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  LinearProgress
} from '@mui/material';
import StepContent from '@mui/material/StepContent';
import { useDispatch, useSelector } from '../../../store';
import { uploadCsvFile, downloadCsvTemplate, resetUpload } from '../../../store/slices/inventory';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { CloudUpload, Map as MapIcon, Visibility as VisibilityIcon, DoneAll as DoneAllIcon, Close as CloseIcon } from '@mui/icons-material';
import StepImportResult from '../UploadSteps/StepImportResult';
import StepUploadSelect from '../UploadSteps/StepUploadSelect';
import StepMapColumns from '../UploadSteps/StepMapColumns';
import StepValidatePreview from '../UploadSteps/StepValidatePreview';
import {
  INVENTORY_FIELDS,
  InventoryField,
  REQUIRED_FIELDS,
  autoMapFields,
  buildMappedCsv,
  downloadDemoInventoryCsv
} from '../../../utils/inventoryUtils';

type Props = {
  open: boolean;
  onClose: () => void;
};

const steps = ['Upload CSV', 'Map Columns', 'Preview & Import', 'Import Result'];

export const InventoryCSVImportModal: React.FC<Props> = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { currentRole } = useSelector((s) => s.auth);
  const { uploadProgress, uploadStatus, uploadResult } = useSelector((s) => s.inventory);

  const [activeStep, setActiveStep] = React.useState(0);

  // Watch for upload completion and move to result step
  React.useEffect(() => {
    if (activeStep === 2 && (uploadStatus === 'success' || uploadStatus === 'error')) {
      setActiveStep(3);
    }
  }, [activeStep, uploadStatus]);
  const [file, setFile] = React.useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [csvRows, setCsvRows] = React.useState<Record<string, any>[]>([]);
  const [fieldMap, setFieldMap] = React.useState<Record<InventoryField, string>>({
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
  });
  const [mappingErrors, setMappingErrors] = React.useState<string[]>([]);
  const [autoMappedFields, setAutoMappedFields] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (open) {
      dispatch(resetUpload());
    }
  }, [open, dispatch]);

  const handleDownloadTemplate = async () => {
    try {
      const result = await dispatch(downloadCsvTemplate() as any);

      // Handle both fulfilled and rejected cases
      if (result.type?.endsWith('/rejected')) {
        return;
      }

      const blob = result.payload;
      if (!blob) {
        console.error('No blob received');
        return;
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory_template.csv';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  // Dropzone
  const onDrop = React.useCallback((accepted: File[]) => {
    if (!accepted.length) return;
    const f = accepted[0];
    setFile(f);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transform: (v) => (typeof v === 'string' ? v.trim() : v),
      complete: (res) => {
        const rows = (res.data as any[]).filter(Boolean);
        const rawHeaders = (res.meta.fields || Object.keys(rows[0] || {})) as string[];
        // Normalize headers to avoid trailing spaces/BOM/unicode space issues
        const headers = rawHeaders
          .map((h) => (typeof h === 'string' ? h.replace(/^\uFEFF/, '').trim() : h))
          .filter((h) => !!h && String(h).length > 0) as string[];
        setCsvHeaders(headers);
        setCsvRows(rows as Record<string, any>[]);

        // Auto-map fields and advance to next step
        const autoMapping = autoMapFields(headers);
        const mappedFields = new Set(Object.keys(autoMapping));
        setAutoMappedFields(mappedFields);
        setFieldMap((prev) => ({ ...prev, ...autoMapping }));

        // Auto-advance to field mapping step
        setTimeout(() => {
          setActiveStep(1);
        }, 100);
      }
    });
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] } });

  const buildMappedCsvLocal = () => {
    return buildMappedCsv(csvRows, fieldMap);
  };

  const handleNext = async () => {
    // Step 0 -> Step 1: validate
    if (activeStep === 0) {
      if (file) setActiveStep(1);
      return;
    }
    // Step 1 -> Step 2: validate mapped CSV
    if (activeStep === 1) {
      const missing = REQUIRED_FIELDS.filter((f: string) => !fieldMap[f as InventoryField]);
      if (missing.length) {
        setMappingErrors([`Missing required mappings: ${missing.join(', ')}`]);
        return;
      }
      setMappingErrors([]);
      setActiveStep(2);
      return;
    }
    // Step 2 -> Step 3: upload mapped CSV
    if (activeStep === 2) {
      if (!currentRole?.id) {
        setMappingErrors(['Select a company from the header before importing inventory.']);
        return;
      }
      if (currentRole.role_type !== 'admin') {
        setMappingErrors(['Admin access is required to import inventory via CSV.']);
        return;
      }
      if (csvRows.length === 0) {
        setMappingErrors(['The CSV file has no data rows to import.']);
        return;
      }
      if (file) {
        setMappingErrors([]);
        // Convert to backend format before uploading
        const { file: backendFile } = buildMappedCsvLocal();
        dispatch(uploadCsvFile(backendFile) as any);
        // Don't set step to 3 immediately - let useEffect handle it when upload completes
      }
      return;
    }
    // Step 3: close modal
    if (activeStep === 3) {
      handleClose();
      return;
    }
  };

  const handleBack = () => {
    if (activeStep > 0) setActiveStep((s) => s - 1);
  };

  const handleClose = () => {
    setActiveStep(0);
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setFieldMap({
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
    });
    setMappingErrors([]);
    setAutoMappedFields(new Set());
    // Reset upload status when closing modal
    dispatch(resetUpload());
    onClose();
  };

  const downloadDemoData = () => {
    downloadDemoInventoryCsv();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="lg"
        scroll="paper"
        PaperProps={{
          sx: { maxHeight: '85vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Import Inventory via CSV
          <Button onClick={handleClose} size="small" sx={{ minWidth: 'auto', p: 1 }}>
            <CloseIcon />
          </Button>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', gap: 2, p: 0, overflow: 'hidden' }} dividers>
          {/* Left: Steps with icons */}
          <Box sx={{ width: 220, borderRight: '1px solid', borderColor: 'divider', p: 2, overflow: 'visible' }}>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((label, idx) => (
                <Step key={label} expanded>
                  <StepLabel
                    icon={
                      idx === 0 ? (
                        <CloudUpload fontSize="small" />
                      ) : idx === 1 ? (
                        <MapIcon fontSize="small" />
                      ) : idx === 2 ? (
                        <VisibilityIcon fontSize="small" />
                      ) : (
                        <DoneAllIcon fontSize="small" />
                      )
                    }
                  >
                    {label}
                  </StepLabel>
                  <StepContent />
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Right: Content */}
          <Box sx={{ flex: 1, p: 2, overflowY: 'auto', maxHeight: '70vh' }}>
            {uploadStatus === 'uploading' && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      backgroundColor: 'primary.main'
                    }
                  }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  Uploading... {uploadProgress}% complete
                </Typography>
              </Box>
            )}

            {activeStep === 0 && (
              <StepUploadSelect
                isDragActive={isDragActive}
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                file={file}
                onDownloadTemplate={handleDownloadTemplate}
                onDownloadDemo={downloadDemoData}
              />
            )}

            {activeStep === 1 && (
              <StepMapColumns
                requiredFields={REQUIRED_FIELDS}
                optionalFields={INVENTORY_FIELDS.filter((f: string) => !REQUIRED_FIELDS.includes(f as any)) as string[]}
                csvHeaders={csvHeaders}
                fieldMap={fieldMap as any}
                autoMappedFields={autoMappedFields}
                mappingErrors={mappingErrors}
                setFieldMap={(updater: (prev: Record<InventoryField, string>) => Record<InventoryField, string>) =>
                  setFieldMap((m) => updater(m))
                }
                clearMapping={(field: string) => {
                  setFieldMap((m) => ({ ...m, [field]: '' }) as any);
                  setAutoMappedFields((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(field);
                    return newSet;
                  });
                }}
              />
            )}

            {activeStep === 2 && mappingErrors.length > 0 && (
              <Box sx={{ mb: 2 }}>
                {mappingErrors.map((err) => (
                  <Typography key={err} variant="body2" color="error" sx={{ mb: 0.5 }}>
                    {err}
                  </Typography>
                ))}
              </Box>
            )}

            {activeStep === 2 && (
              <Box>
                {uploadStatus === 'uploading' ? (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 600 }}>
                      Processing CSV Upload...
                    </Typography>

                    {/* Enhanced Progress Bar */}
                    <Box sx={{ mb: 3 }}>
                      <LinearProgress
                        variant="determinate"
                        value={uploadProgress}
                        sx={{
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 6,
                            background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                            boxShadow: '0 2px 4px rgba(25, 118, 210, 0.3)'
                          }
                        }}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                        {uploadProgress}% complete - Processing {csvRows.length} rows...
                      </Typography>
                    </Box>

                    {/* Status Information */}
                    <Box sx={{ p: 3, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                        Processing Status:
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2" color="text.primary">
                          ✓ Validating data format and business rules
                        </Typography>
                        <Typography variant="body2" color="text.primary">
                          ✓ Checking for duplicates and conflicts
                        </Typography>
                        <Typography variant="body2" color="text.primary">
                          ✓ Uploading to database...
                        </Typography>
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                          → Processing row {Math.floor((uploadProgress / 100) * csvRows.length)} of {csvRows.length}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Additional Info */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Please keep this window open during the upload process. Large files may take several minutes to process.
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <StepValidatePreview fields={[...INVENTORY_FIELDS]} csvRows={csvRows} fieldMap={fieldMap as any} />
                )}
              </Box>
            )}

            {activeStep === 3 && (
              <StepImportResult
                upload={{
                  inProgress: uploadStatus === 'uploading',
                  progress: uploadProgress,
                  lastResult: uploadResult || null
                }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Box sx={{ flex: 1 }} />
          {activeStep === 2 && (
            <Button onClick={handleBack} variant="outlined">
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={(activeStep === 0 && !file) || (activeStep === 2 && uploadStatus === 'uploading')}
          >
            {activeStep < 2 ? 'Next' : activeStep === 2 ? (uploadStatus === 'uploading' ? 'Uploading...' : 'Import') : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InventoryCSVImportModal;
