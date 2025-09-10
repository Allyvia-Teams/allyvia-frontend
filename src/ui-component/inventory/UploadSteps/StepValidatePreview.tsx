import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

type Props = {
  fields: string[];
  csvRows: Record<string, any>[];
  fieldMap: Record<string, string>;
};

const StepValidatePreview: React.FC<Props> = ({ fields, csvRows, fieldMap }) => {
  return (
    <Box>
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

      <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
        <Typography variant="body2" color="info.contrastText" sx={{ mb: 1 }}>
          <strong>Processing Information:</strong>
        </Typography>
        <Typography variant="body2" color="info.contrastText">
          • Large files will be processed in batches of 100 rows
        </Typography>
        <Typography variant="body2" color="info.contrastText">
          • Processing time: ~{Math.ceil(csvRows.length / 100)} batch(es)
        </Typography>
        <Typography variant="body2" color="info.contrastText">
          • Estimated duration: {Math.ceil(csvRows.length / 100) * 2}s
        </Typography>
      </Box>
    </Box>
  );
};

export default StepValidatePreview;
