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
import { uploadPaymentCsvFile, downloadPaymentCsvTemplate, resetPaymentUpload } from '../../../store/slices/finance';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { CloudUpload, Map as MapIcon, Visibility as VisibilityIcon, DoneAll as DoneAllIcon, Close as CloseIcon } from '@mui/icons-material';
import StepImportResult from '../../inventory/UploadSteps/StepImportResult';
import StepUploadSelect from '../../inventory/UploadSteps/StepUploadSelect';
import StepMapColumns from '../../inventory/UploadSteps/StepMapColumns';
import StepValidatePreview from '../../inventory/UploadSteps/StepValidatePreview';
import {
  PAYMENT_FIELDS,
  PaymentField,
  REQUIRED_FIELDS,
  autoMapFields,
  buildMappedCsv,
  downloadDemoPaymentCsv,
  createEmptyPaymentFieldMap
} from '../../../utils/paymentUtils';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const steps = ['Upload CSV', 'Map Columns', 'Preview & Import', 'Import Result'];

export const PaymentCSVImportModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const { currentRole } = useSelector((s) => s.auth);
  const { paymentUploadProgress, paymentUploadStatus, paymentUploadResult } = useSelector((s) => s.finance);

  const [activeStep, setActiveStep] = React.useState(0);

  React.useEffect(() => {
    if (activeStep === 2 && (paymentUploadStatus === 'success' || paymentUploadStatus === 'error')) {
      setActiveStep(3);
    }
  }, [activeStep, paymentUploadStatus]);

  React.useEffect(() => {
    if (paymentUploadStatus === 'success') {
      onSuccess?.();
    }
  }, [paymentUploadStatus, onSuccess]);

  const [file, setFile] = React.useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [csvRows, setCsvRows] = React.useState<Record<string, any>[]>([]);
  const [fieldMap, setFieldMap] = React.useState<Record<PaymentField, string>>(createEmptyPaymentFieldMap());
  const [mappingErrors, setMappingErrors] = React.useState<string[]>([]);
  const [autoMappedFields, setAutoMappedFields] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (open) {
      dispatch(resetPaymentUpload());
    }
  }, [open, dispatch]);

  const handleDownloadTemplate = async () => {
    try {
      const result = await dispatch(downloadPaymentCsvTemplate() as any);
      if (result.type?.endsWith('/rejected')) {
        return;
      }

      const blob = result.payload;
      if (!blob) {
        console.error('No blob received');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payment_template.csv';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

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
        const headers = rawHeaders
          .map((h) => (typeof h === 'string' ? h.replace(/^\uFEFF/, '').trim() : h))
          .filter((h) => !!h && String(h).length > 0) as string[];
        setCsvHeaders(headers);
        setCsvRows(rows as Record<string, any>[]);

        const autoMapping = autoMapFields(headers);
        const mappedFields = new Set(Object.keys(autoMapping).filter((k) => autoMapping[k as PaymentField]));
        setAutoMappedFields(mappedFields);
        setFieldMap((prev) => ({ ...prev, ...autoMapping }));

        setTimeout(() => {
          setActiveStep(1);
        }, 100);
      }
    });
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] } });

  const buildMappedCsvLocal = () => buildMappedCsv(csvRows, fieldMap);

  const handleNext = async () => {
    if (activeStep === 0) {
      if (file) setActiveStep(1);
      return;
    }

    if (activeStep === 1) {
      const missing = REQUIRED_FIELDS.filter((f) => !fieldMap[f]);
      if (missing.length) {
        setMappingErrors([`Missing required mappings: ${missing.join(', ')}`]);
        return;
      }
      setMappingErrors([]);
      setActiveStep(2);
      return;
    }

    if (activeStep === 2) {
      if (!currentRole?.id) {
        setMappingErrors(['Select a company from the header before importing payments.']);
        return;
      }
      if (currentRole.role_type !== 'admin') {
        setMappingErrors(['Admin access is required to Import Payments via CSV.']);
        return;
      }
      if (csvRows.length === 0) {
        setMappingErrors(['The CSV file has no data rows to import.']);
        return;
      }
      if (file) {
        setMappingErrors([]);
        const { file: backendFile } = buildMappedCsvLocal();
        dispatch(uploadPaymentCsvFile(backendFile) as any);
      }
      return;
    }

    if (activeStep === 3) {
      handleClose();
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
    setFieldMap(createEmptyPaymentFieldMap());
    setMappingErrors([]);
    setAutoMappedFields(new Set());
    dispatch(resetPaymentUpload());
    onClose();
  };

  return (
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
        Import Payments via CSV
        <Button onClick={handleClose} size="small" sx={{ minWidth: 'auto', p: 1 }}>
          <CloseIcon />
        </Button>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', gap: 2, p: 0, overflow: 'hidden' }} dividers>
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

        <Box sx={{ flex: 1, p: 2, overflowY: 'auto', maxHeight: '70vh' }}>
          {paymentUploadStatus === 'uploading' && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={paymentUploadProgress}
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
                Uploading... {paymentUploadProgress}% complete
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
              onDownloadDemo={downloadDemoPaymentCsv}
            />
          )}

          {activeStep === 1 && (
            <StepMapColumns
              requiredFields={REQUIRED_FIELDS}
              optionalFields={PAYMENT_FIELDS.filter((f) => !REQUIRED_FIELDS.includes(f)) as string[]}
              csvHeaders={csvHeaders}
              fieldMap={fieldMap as any}
              autoMappedFields={autoMappedFields}
              mappingErrors={mappingErrors}
              setFieldMap={(updater: (prev: Record<PaymentField, string>) => Record<PaymentField, string>) =>
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
              {paymentUploadStatus === 'uploading' ? (
                <Box>
                  <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 600 }}>
                    Processing CSV Upload...
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    <LinearProgress
                      variant="determinate"
                      value={paymentUploadProgress}
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
                      {paymentUploadProgress}% complete - Processing {csvRows.length} rows...
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <StepValidatePreview fields={[...PAYMENT_FIELDS]} csvRows={csvRows} fieldMap={fieldMap as any} />
              )}
            </Box>
          )}

          {activeStep === 3 && (
            <StepImportResult
              upload={{
                inProgress: paymentUploadStatus === 'uploading',
                progress: paymentUploadProgress,
                lastResult: paymentUploadResult || null
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
          disabled={(activeStep === 0 && !file) || (activeStep === 2 && paymentUploadStatus === 'uploading')}
        >
          {activeStep < 2 ? 'Next' : activeStep === 2 ? (paymentUploadStatus === 'uploading' ? 'Uploading...' : 'Import') : 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentCSVImportModal;
