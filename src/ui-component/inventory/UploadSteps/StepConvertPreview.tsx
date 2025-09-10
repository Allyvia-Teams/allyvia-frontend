import React from 'react';
import { Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

type Props = {
  fields: string[];
  buildMappedCsvLocal: () => { backendRows: any[] } | any;
  totalRows: number;
};

const StepConvertPreview: React.FC<Props> = ({ fields, buildMappedCsvLocal, totalRows }) => {
  return (
    <>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Backend Format Preview (first 5 rows):
      </Typography>
      <Paper variant="outlined" sx={{ height: 300, overflow: 'auto', mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {fields.map((f) => (
                <TableCell key={f}>{f}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {(() => {
              const { backendRows } = buildMappedCsvLocal();
              return backendRows.slice(0, 5).map((row: any, ri: number) => (
                <TableRow key={ri}>
                  {fields.map((f) => (
                    <TableCell key={f}>{row[f] === null ? 'null' : row[f] === '' ? '""' : String(row[f])}</TableCell>
                  ))}
                </TableRow>
              ));
            })()}
          </TableBody>
        </Table>
      </Paper>
      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
        Ready to upload {totalRows} rows in backend format.
      </Typography>
    </>
  );
};

export default StepConvertPreview;
