import React from 'react';
import {
  Box,
  Chip,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type Props = {
  requiredFields: string[];
  optionalFields: string[];
  csvHeaders: string[];
  fieldMap: Record<string, string>;
  autoMappedFields: Set<string>;
  mappingErrors: string[];
  setFieldMap: (updater: (m: Record<string, string>) => Record<string, string>) => void;
  clearMapping: (field: string) => void;
};

const StepMapColumns: React.FC<Props> = ({
  requiredFields,
  optionalFields,
  csvHeaders,
  fieldMap,
  autoMappedFields,
  mappingErrors,
  setFieldMap,
  clearMapping
}) => {
  return (
    <Box>
      {mappingErrors.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1, mb: 1, borderColor: 'error.main' }}>
          {mappingErrors.map((e, i) => (
            <Typography key={i} variant="caption" color="error" sx={{ display: 'block' }}>
              {e}
            </Typography>
          ))}
        </Paper>
      )}
      {autoMappedFields.size > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
          <Typography variant="body2" color="success.contrastText">
            <strong>Auto-mapping completed!</strong> {autoMappedFields.size} field(s) were automatically mapped based on column names.
          </Typography>
        </Box>
      )}

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          Required Fields (Must be mapped)
        </Typography>
        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width="40%">System Field</TableCell>
                <TableCell width="40%">CSV Column</TableCell>
                <TableCell width="20%">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requiredFields.map((field) => {
                const mapped = fieldMap[field];
                return (
                  <TableRow key={field}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {field.replace('_', ' ').toUpperCase()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={mapped || ''}
                          onChange={(e) => setFieldMap((m) => ({ ...m, [field]: e.target.value as string }))}
                          displayEmpty
                        >
                          <MenuItem value="" disabled>
                            Select CSV column
                          </MenuItem>
                          {csvHeaders.map((header) => (
                            <MenuItem key={header} value={header}>
                              {header}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      {mapped ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={autoMappedFields.has(field) ? 'Auto-mapped' : 'Mapped'} color="success" size="small" />
                          <IconButton size="small" onClick={() => clearMapping(field)} color="warning" title="Clear mapping">
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Chip label="Required" color="error" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {optionalFields.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            Optional Fields (Can be mapped if available)
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="40%">System Field</TableCell>
                  <TableCell width="40%">CSV Column</TableCell>
                  <TableCell width="20%">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {optionalFields.map((field) => {
                  const mapped = fieldMap[field];
                  return (
                    <TableRow key={field}>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {field.replace('_', ' ').toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={mapped || ''}
                            onChange={(e) => setFieldMap((m) => ({ ...m, [field]: e.target.value as string }))}
                            displayEmpty
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            {csvHeaders.map((header) => (
                              <MenuItem key={header} value={header}>
                                {header}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        {mapped ? (
                          <Chip label={autoMappedFields.has(field) ? 'Auto-mapped' : 'Mapped'} color="success" size="small" />
                        ) : (
                          <Chip label="Optional" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default StepMapColumns;
