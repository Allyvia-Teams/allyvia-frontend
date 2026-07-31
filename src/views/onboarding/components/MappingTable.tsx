import type { ReactElement } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import type { MappingRow, TargetOptionGroup } from '../mapping';
import { sampleValues } from '../mapping';
import ConfidenceBadge from './ConfidenceBadge';
import TransformChips from './TransformChips';

interface MappingTableProps {
  rows: MappingRow[];
  groups: TargetOptionGroup[];
  previewRows: Array<Record<string, unknown>>;
  disabled: boolean;
  pendingChange: { column: string; target: string } | null;
  errors: Record<string, string>; // column-keyed — client validation and server 400 detail share this shape
  onTargetChange: (column: string, target: string) => void;
}

// Flatten groups into Select children (a fragment per group breaks MUI's
// Select child handling, so build one flat array).
const buildSelectChildren = (groups: TargetOptionGroup[]) => {
  const children: ReactElement[] = [];
  for (const group of groups) {
    children.push(<ListSubheader key={`header-${group.label}`}>{group.label}</ListSubheader>);
    for (const option of group.options) {
      children.push(
        <MenuItem key={option.value} value={option.value}>
          <ListItemText
            primary={
              <Stack direction="row" spacing={0.5} alignItems="center">
                <span>{option.label}</span>
                {option.required && (
                  <Tooltip title="Required field for this entity">
                    <Typography component="span" color="error.main">
                      *
                    </Typography>
                  </Tooltip>
                )}
              </Stack>
            }
            secondary={option.description || undefined}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>
      );
    }
  }
  return children;
};

export default function MappingTable({ rows, groups, previewRows, disabled, pendingChange, errors, onTargetChange }: MappingTableProps) {
  const selectChildren = buildSelectChildren(groups);

  return (
    <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Column</TableCell>
            <TableCell>Sample values</TableCell>
            <TableCell sx={{ minWidth: 220 }}>Maps to</TableCell>
            <TableCell>Confidence</TableCell>
            <TableCell>Transforms</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const value = pendingChange?.column === row.column ? pendingChange.target : row.target;
            const error = errors[row.column];
            const extended = sampleValues(previewRows, row.column, 10);
            return (
              <TableRow key={row.column}>
                <TableCell>
                  <Stack spacing={0.5} alignItems="flex-start">
                    <Typography variant="subtitle2">{row.column}</Typography>
                    <Chip size="small" variant="outlined" label={row.displayType} />
                  </Stack>
                </TableCell>
                <TableCell sx={{ maxWidth: 240 }}>
                  <Tooltip title={extended.join(' · ')}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-word' }}>
                      {row.samples.length > 0 ? row.samples.join(', ') : '—'}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FormControl size="small" fullWidth error={!!error}>
                      <Select
                        displayEmpty
                        value={value}
                        disabled={disabled}
                        onChange={(event) => onTargetChange(row.column, event.target.value)}
                        renderValue={(selected) =>
                          selected ? (
                            <span>{String(selected)}</span>
                          ) : (
                            <Typography component="span" color="text.secondary">
                              Choose target
                            </Typography>
                          )
                        }
                        MenuProps={{ PaperProps: { sx: { maxHeight: 420 } } }}
                      >
                        {selectChildren}
                      </Select>
                      {error && <FormHelperText>{error}</FormHelperText>}
                    </FormControl>
                    {pendingChange?.column === row.column && (
                      <Box sx={{ display: 'flex' }}>
                        <CircularProgress size={16} />
                      </Box>
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <ConfidenceBadge confidence={row.confidence} source={row.source} />
                </TableCell>
                <TableCell>
                  <TransformChips transforms={row.transforms} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
