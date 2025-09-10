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
    const rows = normalizedErrors.map((e: any) => ({ error: `${e.field} - ${e.message}` }));
    const csv = Papa.unparse(rows, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_import_errors_${new Date().toISOString().slice(0, 10)}.csv`;
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
          {normalizedErrors.length}
        </Alert>
      </Box>

      {normalizedErrors.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Errors ({normalizedErrors.length})</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" onClick={downloadCombinedErrorData} startIcon={<IconDownload size={16} />}>
                Download Error Data
              </Button>
            </Box>
          </Box>

          <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  <TableCell>Field</TableCell>
                  <TableCell>Issue</TableCell>
                  <TableCell>CSV Value</TableCell>
                  <TableCell>Suggested Fix</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processErrors(normalizedErrors, lr?.csvData).map((err: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{err.row}</TableCell>
                    <TableCell>{err.field}</TableCell>
                    <TableCell>{err.message}</TableCell>
                    <TableCell>{err.csvValue}</TableCell>
                    <TableCell>{err.suggestedFix}</TableCell>
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
