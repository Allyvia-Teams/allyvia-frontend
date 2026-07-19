import React from 'react';
import { Alert, AlertTitle, Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { VendorRowValidationError } from 'utils/vendorUtils';

type Props = {
  fields: string[];
  csvRows: Record<string, any>[];
  fieldMap: Record<string, string>;
  validationErrors: VendorRowValidationError[];
};

const StepValidatePreview: React.FC<Props> = ({ fields, csvRows, fieldMap, validationErrors }) => {
  return (
    <Box>
      {validationErrors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>
            {validationErrors.length} validation issue{validationErrors.length === 1 ? '' : 's'} found
          </AlertTitle>
          <Box sx={{ maxHeight: 160, overflow: 'auto' }}>
            {validationErrors.slice(0, 50).map((err, idx) => (
              <Typography key={idx} variant="body2">
                Row {err.row} ({err.field}): {err.message}
              </Typography>
            ))}
            {validationErrors.length > 50 && (
              <Typography variant="body2" color="text.secondary">
                ... and {validationErrors.length - 50} more
              </Typography>
            )}
          </Box>
        </Alert>
      )}

      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Preview (first 10 mapped rows)
      </Typography>
      <Paper variant="outlined" sx={{ height: 420, overflow: 'auto', mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {fields.map((f) => (
                <TableCell key={f}>{f}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {csvRows.slice(0, 10).map((row, ri) => (
              <TableRow key={ri}>
                {fields.map((f) => (
                  <TableCell key={f}>{row[fieldMap[f]] ?? ''}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
        Ready to import {csvRows.length} rows.
      </Typography>
    </Box>
  );
};

export default StepValidatePreview;
