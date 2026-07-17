// ui-component/vendors/modals/VendorImportModal.tsx
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
import { useDispatch, useSelector } from 'store';
import { uploadVendorCsv, resetUpload } from 'store/slices/vendors';
import { downloadVendorCsvTemplate } from 'api/vendors.api';
import { useDropzone } from 'react-dropzone';
import { CloudUpload, Map as MapIcon, Visibility as VisibilityIcon, DoneAll as DoneAllIcon, Close as CloseIcon } from '@mui/icons-material';
import StepImportResult from '../UploadSteps/StepImportResult';
import StepUploadSelect from '../UploadSteps/StepUploadSelect';
import StepMapColumns from '../UploadSteps/StepMapColumns';
import StepValidatePreview from '../UploadSteps/StepValidatePreview';
import {
  VENDOR_FIELDS,
  VendorField,
  REQUIRED_FIELDS,
  autoMapFields,
  buildMappedCsv,
  emptyVendorFieldMap,
  validateRows,
  VendorRowValidationError
} from 'utils/vendorUtils';
import { parseSpreadsheetFile } from 'utils/spreadsheetParser';

type Props = {
  open: boolean;
  onClose: () => void;
};

const steps = ['Upload File', 'Map Columns', 'Preview & Import', 'Import Result'];

export const VendorImportModal: React.FC<Props> = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { currentRole } = useSelector((s) => s.auth);
  const { uploadProgress, uploadStatus, uploadResult } = useSelector((s) => s.vendors);

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
  const [fieldMap, setFieldMap] = React.useState<Record<VendorField, string>>(emptyVendorFieldMap());
  const [mappingErrors, setMappingErrors] = React.useState<string[]>([]);
  const [autoMappedFields, setAutoMappedFields] = React.useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = React.useState<VendorRowValidationError[]>([]);

  React.useEffect(() => {
    if (open) {
      dispatch(resetUpload());
    }
  }, [open, dispatch]);

  const handleDownloadTemplate = async () => {
    try {
      if (!currentRole?.company_id) {
        setMappingErrors(['Select a company from the header before downloading the template.']);
        return;
      }
      await downloadVendorCsvTemplate(currentRole.company_id);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  // Dropzone
  const onDrop = React.useCallback(async (accepted: File[]) => {
    if (!accepted.length) return;
    const f = accepted[0];
    setFile(f);
    setMappingErrors([]);

    try {
      const { headers, rows } = await parseSpreadsheetFile(f);
      setCsvHeaders(headers);
      setCsvRows(rows);

      // Auto-map fields and advance to next step
      const autoMapping = autoMapFields(headers);
      const mappedFields = new Set(Object.keys(autoMapping).filter((key) => autoMapping[key as VendorField]));
      setAutoMappedFields(mappedFields);
      setFieldMap((prev) => ({ ...prev, ...autoMapping }));

      // Auto-advance to field mapping step
      setTimeout(() => {
        setActiveStep(1);
      }, 100);
    } catch (error: any) {
      setFile(null);
      setCsvHeaders([]);
      setCsvRows([]);
      setMappingErrors([error?.message || 'Failed to parse the selected file.']);
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    }
  });

  const handleNext = async () => {
    // Step 0 -> Step 1: validate
    if (activeStep === 0) {
      if (file) setActiveStep(1);
      return;
    }
    // Step 1 -> Step 2: validate mapped columns
    if (activeStep === 1) {
      const missing = REQUIRED_FIELDS.filter((f) => !fieldMap[f]);
      if (missing.length) {
        setMappingErrors([`Missing required mappings: ${missing.join(', ')}`]);
        return;
      }
      setMappingErrors([]);
      setValidationErrors(validateRows(csvRows, fieldMap));
      setActiveStep(2);
      return;
    }
    // Step 2 -> Step 3: upload mapped CSV
    if (activeStep === 2) {
      if (!currentRole?.id) {
        setMappingErrors(['Select a company from the header before importing vendors.']);
        return;
      }
      if (currentRole.role_type !== 'admin') {
        setMappingErrors(['Admin access is required to import vendors.']);
        return;
      }
      if (csvRows.length === 0) {
        setMappingErrors(['The file has no data rows to import.']);
        return;
      }
      if (file) {
        setMappingErrors([]);
        // Convert to backend CSV format before uploading
        const { file: backendFile } = buildMappedCsv(csvRows, fieldMap);
        dispatch(uploadVendorCsv(backendFile) as any);
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
    setFieldMap(emptyVendorFieldMap());
    setMappingErrors([]);
    setAutoMappedFields(new Set());
    setValidationErrors([]);
    // Reset upload status when closing modal
    dispatch(resetUpload());
    onClose();
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
          Import Vendors
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
              <>
                {mappingErrors.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    {mappingErrors.map((err) => (
                      <Typography key={err} variant="body2" color="error" sx={{ mb: 0.5 }}>
                        {err}
                      </Typography>
                    ))}
                  </Box>
                )}
                <StepUploadSelect
                  isDragActive={isDragActive}
                  getRootProps={getRootProps}
                  getInputProps={getInputProps}
                  file={file}
                  onDownloadTemplate={handleDownloadTemplate}
                />
              </>
            )}

            {activeStep === 1 && (
              <StepMapColumns
                requiredFields={REQUIRED_FIELDS}
                optionalFields={VENDOR_FIELDS.filter((f: string) => !REQUIRED_FIELDS.includes(f as VendorField)) as string[]}
                csvHeaders={csvHeaders}
                fieldMap={fieldMap as any}
                autoMappedFields={autoMappedFields}
                mappingErrors={mappingErrors}
                setFieldMap={(updater: (prev: Record<string, string>) => Record<string, string>) =>
                  setFieldMap((m) => updater(m) as Record<VendorField, string>)
                }
                clearMapping={(field: string) => {
                  setFieldMap((m) => ({ ...m, [field]: '' }) as Record<VendorField, string>);
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
                      Processing Upload...
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

                    {/* Additional Info */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Please keep this window open during the upload process. Large files may take several minutes to process.
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <StepValidatePreview
                    fields={[...VENDOR_FIELDS]}
                    csvRows={csvRows}
                    fieldMap={fieldMap as any}
                    validationErrors={validationErrors}
                  />
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
          {activeStep === 3 && (
            <Button
              onClick={() => {
                dispatch(resetUpload());
                setActiveStep(0);
                setFile(null);
                setCsvHeaders([]);
                setCsvRows([]);
                setFieldMap(emptyVendorFieldMap());
                setMappingErrors([]);
                setAutoMappedFields(new Set());
                setValidationErrors([]);
              }}
              variant="outlined"
            >
              Import Another File
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

export default VendorImportModal;
