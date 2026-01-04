import React from 'react';
import { Alert, AlertTitle, Box, Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import Papa from 'papaparse';
import { IconDownload } from '@tabler/icons-react';

type Props = {
  upload: any;
};

const StepImportResult: React.FC<Props> = ({ upload }) => {
  const errorData = React.useMemo(() => {
    const result: any[] = [];
    const errorRows = new Set<number>();
    const lr: any = upload?.lastResult || null;
    if (!lr) return { normalizedErrors: result, errorRowCount: 0 };

    // Handle errors from the new response structure
    if (Array.isArray(lr.errors) && lr.errors.length) {
      lr.errors.forEach((e: any) => {
        result.push({
          row: e.row,
          field: e.field,
          message: e.message ?? e.error ?? '',
          original_row: e.original_row
        });
        errorRows.add(e.row);
      });
    }

    // Handle csvData with errors from the new response structure
    if (Array.isArray(lr.csvData) && lr.csvData.length) {
      lr.csvData.forEach((e: any) => {
        if (e.error) {
          result.push({
            row: e.row,
            field: 'Validation errors',
            message: e.error,
            original_row: e.row
          });
          errorRows.add(e.row);
        }
      });
    }

    return { normalizedErrors: result, errorRowCount: errorRows.size };
  }, [upload?.lastResult]);

  const { normalizedErrors, errorRowCount } = errorData;

  const downloadCombinedErrorData = () => {
    if (!normalizedErrors.length) return;

    // Get original CSV data from upload result
    const lr: any = upload?.lastResult || {};
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

  const lr: any = upload?.lastResult || {};
  // Ensure values are parsed as numbers (they might come as strings from the API)
  const created = Number(lr?.created) || 0;
  const updated = Number(lr?.updated) || 0;
  const totalRows = Number(lr?.total_rows) || 0;
  
  // Debug logging to help diagnose issues
  React.useEffect(() => {
    if (lr && Object.keys(lr).length > 0) {
      console.log('CSV Upload Result:', {
        created: lr.created,
        updated: lr.updated,
        total_rows: lr.total_rows,
        errors: lr.errors?.length || 0,
        fullResult: lr
      });
    }
  }, [lr]);

  // Show loading state if upload is still in progress
  if (upload?.inProgress) {
    return (
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Processing Upload...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while your CSV file is being processed.
        </Typography>
      </Box>
    );
  }

  // Show error state if no result data or if there's an error
  if (!lr || Object.keys(lr).length === 0) {
    // Check if there's an error message in the upload result
    const errorMessage = lr?.error || lr?.details || null;
    
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Upload Failed</AlertTitle>
          {errorMessage || 'No result data available. Please try the import again.'}
        </Alert>
        {lr?.errors && Array.isArray(lr.errors) && lr.errors.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Error Details:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
              {lr.errors.map((err: any, idx: number) => (
                <Typography key={idx} variant="body2" sx={{ mb: 1 }}>
                  {err.message || err.error || JSON.stringify(err)}
                </Typography>
              ))}
            </Paper>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Import Result
      </Typography>

      {/* Summary Statistics */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Alert severity="success" sx={{ flex: 1, minWidth: 160 }}>
          <AlertTitle>Successful</AlertTitle>
          {created + updated}
        </Alert>
        <Alert severity={errorRowCount > 0 ? 'error' : 'success'} sx={{ flex: 1, minWidth: 160 }}>
          <AlertTitle>Errors</AlertTitle>
          {errorRowCount}
        </Alert>
        <Alert severity="info" sx={{ flex: 1, minWidth: 160 }}>
          <AlertTitle>Total Rows</AlertTitle>
          {totalRows}
        </Alert>
      </Box>

      {normalizedErrors.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Errors ({errorRowCount})</Typography>
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
                  <TableCell sx={{ minWidth: 200, maxWidth: 300 }}>Error</TableCell>
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
                    <TableCell sx={{ minWidth: 200, maxWidth: 300, wordWrap: 'break-word' }}>{row.error || ''}</TableCell>
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
