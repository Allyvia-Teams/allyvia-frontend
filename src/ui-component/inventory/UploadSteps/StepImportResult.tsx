import React from 'react';
import { Alert, AlertTitle, Box, Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import Papa from 'papaparse';
import { IconDownload } from '@tabler/icons-react';

type Props = {
  upload: any;
  processErrors: (errors: { row: number; field: string; message: string }[], csvData?: any[]) => any[];
};

const StepImportResult: React.FC<Props> = ({ upload, processErrors }) => {
  const normalizedErrors = React.useMemo(() => {
    const result: any[] = [];
    const lr: any = (upload?.lastResult && (upload.lastResult.data ?? upload.lastResult)) || null;
    if (!lr) return result;
    if (Array.isArray(lr.errors) && lr.errors.length) {
      lr.errors.forEach((e: any) => {
        result.push({ row: e.row, field: e.field, message: e.message ?? e.error ?? '', original_row: e.original_row });
      });
    }
    if (result.length === 0 && Array.isArray(lr.csvData) && lr.csvData.length) {
      lr.csvData.forEach((e: any) => {
        result.push({ row: e.row, field: e.field, message: e.message ?? e.error ?? '', original_row: e.original_row });
      });
    }
    return result;
  }, [upload?.lastResult]);

  const downloadCombinedErrorData = () => {
    if (!normalizedErrors.length) return;

    // Get original CSV data from upload result
    const lr: any = (upload?.lastResult && (upload.lastResult.data ?? upload.lastResult)) || {};
    const originalCsvData = lr?.csvData || [];

    // Use csvData as-is since backend already sends error in correct format
    const combinedData = originalCsvData;

    const csv = Papa.unparse(combinedData, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_import_with_errors_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lr: any = (upload?.lastResult && (upload.lastResult.data ?? upload.lastResult)) || {};
  const created = lr?.created ?? 0;
  const updated = lr?.updated ?? 0;
  const successful = (created || 0) + (updated || 0);

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Import Result
      </Typography>

      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Alert severity="success" sx={{ flex: 1, minWidth: 160 }}>
          <AlertTitle> Successful</AlertTitle>
          {successful}
        </Alert>
        <Alert severity="error" sx={{ flex: 1, minWidth: 160 }}>
          <AlertTitle>Errors</AlertTitle>
          {normalizedErrors.length - 1}
        </Alert>
      </Box>

      {normalizedErrors.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Errors ({normalizedErrors.length - 1})</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" onClick={downloadCombinedErrorData} startIcon={<IconDownload size={16} />}>
                Download CSV with Errors
              </Button>
            </Box>
          </Box>

          <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Unit Price</TableCell>
                  <TableCell>Cost Price</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Reorder Point</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(lr?.csvData || []).map((row: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{row.row}</TableCell>
                    <TableCell>{row.sku}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>{row.quantity_on_hand}</TableCell>
                    <TableCell>{row.unit_price}</TableCell>
                    <TableCell>{row.cost_price}</TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>{row.reorder_point}</TableCell>
                    <TableCell>{row.error || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default StepImportResult;
