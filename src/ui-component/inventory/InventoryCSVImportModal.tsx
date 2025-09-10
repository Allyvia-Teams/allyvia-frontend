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
import { useDispatch, useSelector } from 'store';
import { uploadCsvFile, resetUpload } from 'store/slices/inventory';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { CloudUpload, Map as MapIcon, Visibility as VisibilityIcon, DoneAll as DoneAllIcon } from '@mui/icons-material';
import StepImportResult from './UploadSteps/StepImportResult';
import StepUploadSelect from './UploadSteps/StepUploadSelect';
import StepMapColumns from './UploadSteps/StepMapColumns';
import StepConvertPreview from './UploadSteps/StepConvertPreview';
import StepValidatePreview from './UploadSteps/StepValidatePreview';
import {
  INVENTORY_FIELDS,
  InventoryField,
  REQUIRED_FIELDS,
  autoMapFields,
  processErrors,
  buildMappedCsv,
  downloadInventoryTemplate,
  downloadDemoInventoryCsv
} from '../../utils/inventoryUtils';

type Props = {
  open: boolean;
  onClose: () => void;
};

const steps = ['Upload CSV', 'Map Columns', 'Convert to Backend Format', 'Validate & Preview', 'Import Result'];

export const InventoryCSVImportModal: React.FC<Props> = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { upload } = useSelector((s) => s.inventory as any);

  const [activeStep, setActiveStep] = React.useState(0);
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
    reorder_point: ''
  });
  const [mappingErrors, setMappingErrors] = React.useState<string[]>([]);
  const [autoMappedFields, setAutoMappedFields] = React.useState<Set<string>>(new Set());

  const handleDownloadTemplate = async () => {
    try {
      downloadInventoryTemplate();
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
      const missing = REQUIRED_FIELDS.filter((f) => !fieldMap[f]);
      if (missing.length) {
        setMappingErrors([`Missing required mappings: ${missing.join(', ')}`]);
        return;
      }
      setMappingErrors([]);
      setActiveStep(2);
      return;
    }
    // Step 2 -> Step 3: convert to backend format
    if (activeStep === 2) {
      setActiveStep(3);
      return;
    }
    // Step 3 -> Step 4: upload mapped CSV
    if (activeStep === 3) {
      const { file: mappedFile } = buildMappedCsvLocal();
      await dispatch(uploadCsvFile(mappedFile) as any);
      setActiveStep(4);
      return;
    }
    // Step 4: close
    if (activeStep === 4) {
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
    setFieldMap({
      sku: '',
      name: '',
      barcode: '',
      description: '',
      quantity_on_hand: '',
      unit_price: '',
      cost_price: '',
      category: '',
      reorder_point: ''
    });
    setMappingErrors([]);
    setAutoMappedFields(new Set());
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
        <DialogTitle>Import Inventory via CSV</DialogTitle>
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
            {upload?.inProgress && <LinearProgress sx={{ mb: 2 }} />}

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
                optionalFields={INVENTORY_FIELDS.filter((f) => !REQUIRED_FIELDS.includes(f))}
                csvHeaders={csvHeaders}
                fieldMap={fieldMap as any}
                autoMappedFields={autoMappedFields}
                mappingErrors={mappingErrors}
                setFieldMap={(updater) => setFieldMap((m) => updater(m as any) as any)}
                clearMapping={(field) => {
                  setFieldMap((m) => ({ ...m, [field]: '' }) as any);
                  setAutoMappedFields((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(field);
                    return newSet;
                  });
                }}
              />
            )}

            {activeStep === 2 && (
              <StepConvertPreview fields={[...INVENTORY_FIELDS]} buildMappedCsvLocal={buildMappedCsvLocal} totalRows={csvRows.length} />
            )}

            {activeStep === 3 && (
              <Box>
                {upload?.inProgress ? (
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      Processing CSV Upload...
                    </Typography>
                    <LinearProgress variant="determinate" value={upload.progress} sx={{ mb: 2, height: 8, borderRadius: 4 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {upload.progress}% complete - Processing {csvRows.length} rows in batches...
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="body2" color="info.contrastText">
                        <strong>Processing Status:</strong>
                      </Typography>
                      <Typography variant="body2" color="info.contrastText">
                        • Validating data format and business rules
                      </Typography>
                      <Typography variant="body2" color="info.contrastText">
                        • Checking for duplicates and conflicts
                      </Typography>
                      <Typography variant="body2" color="info.contrastText">
                        • Uploading to {upload.lastResult?.quickbooks_uploaded ? 'QuickBooks + Local DB' : 'Local DB'}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <StepValidatePreview fields={[...INVENTORY_FIELDS]} csvRows={csvRows} fieldMap={fieldMap as any} />
                )}
              </Box>
            )}

            {activeStep === 4 && <StepImportResult upload={upload} processErrors={processErrors as any} />}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={handleBack} disabled={activeStep === 0} variant="outlined">
            Back
          </Button>
          <Button onClick={handleNext} variant="contained" disabled={activeStep === 0 && !file}>
            {activeStep < 2 ? 'Next' : 'Finish'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InventoryCSVImportModal;
