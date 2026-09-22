// The mapping-review step: what we think each column is, and a way to say no.
//
// This is the screen that makes an aggressive synonym table safe. Auto-mapping
// guesses; a merchant confirms. So every row shows three things — the header as
// it appears in their file, real sample values from it, and how we matched —
// because "is this column the price?" is answerable from sample data and not
// from a field name.

import { useMemo } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { DateOrder, FieldOption, MappingProposal } from 'api/posIntegrations.api';
import ConfidenceChip from './ConfidenceChip';

const EXTRA = 'extra';

const KIND_LABELS: Record<FieldOption['kind'], string> = {
  str: 'Text',
  money: 'Amount',
  qty: 'Quantity',
  bool: 'Yes / no',
  date: 'Date'
};

interface Props {
  proposal: MappingProposal;
  fields: FieldOption[];
  targets: Record<string, string>;
  dateOrder: DateOrder;
  disabled?: boolean;
  onTargetChange: (header: string, target: string) => void;
  onDateOrderChange: (order: DateOrder) => void;
}

export default function MappingReviewTable({ proposal, fields, targets, dateOrder, disabled, onTargetChange, onDateOrderChange }: Props) {
  // A field already claimed by another column is disabled rather than hidden:
  // seeing "Price — used by 'Retail Price'" explains why it cannot be picked,
  // where a missing option just looks like a bug.
  const claimedBy = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(targets).forEach(([header, target]) => {
      if (target && target !== EXTRA) map.set(target, header);
    });
    return map;
  }, [targets]);

  const mappedCount = Object.values(targets).filter((t) => t && t !== EXTRA).length;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2" color="text.secondary">
          {proposal.filename} · {mappedCount} of {proposal.columns.length} columns mapped
        </Typography>
        {proposal.preset && <Chip size="small" color="info" variant="outlined" label={`Looks like a ${proposal.preset} export`} />}
      </Stack>

      {proposal.date_is_ambiguous && (
        <Alert severity="warning">
          <Typography variant="body2" gutterBottom>
            We can’t tell whether the dates in this file are <strong>month/day</strong> or <strong>day/month</strong> — every date in the
            sample could be read either way. Picking the wrong one would file your sales in the wrong months, so please choose.
          </Typography>
          <RadioGroup row value={dateOrder} onChange={(event) => onDateOrderChange(event.target.value as DateOrder)}>
            <FormControlLabel
              value="mdy"
              control={<Radio size="small" disabled={disabled} />}
              label="Month / day / year (03/04 is 4 March)"
            />
            <FormControlLabel
              value="dmy"
              control={<Radio size="small" disabled={disabled} />}
              label="Day / month / year (03/04 is 3 April)"
            />
          </RadioGroup>
        </Alert>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Column in your file</TableCell>
              <TableCell>Example values</TableCell>
              <TableCell>Match</TableCell>
              <TableCell sx={{ minWidth: 220 }}>Import as</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {proposal.columns.map((column) => {
              const value = targets[column.header] ?? EXTRA;
              return (
                <TableRow key={column.header} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{column.header}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {column.samples.length ? column.samples.join(' · ') : '(empty in the sample)'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <ConfidenceChip confidence={column.confidence} source={column.source} />
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth size="small">
                      <Select
                        value={value}
                        disabled={disabled}
                        onChange={(event) => onTargetChange(column.header, event.target.value)}
                        renderValue={(selected) => (selected === EXTRA ? 'Keep as extra data' : (selected as string))}
                      >
                        <MenuItem value={EXTRA}>
                          <ListItemText
                            primary="Keep as extra data"
                            secondary="Imported and kept, but not mapped to a field"
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </MenuItem>
                        {fields.map((field) => {
                          const owner = claimedBy.get(field.name);
                          const takenByAnother = owner && owner !== column.header;
                          return (
                            <MenuItem key={field.name} value={field.name} disabled={!!takenByAnother}>
                              <ListItemText
                                primary={field.name}
                                secondary={takenByAnother ? `Already used by “${owner}”` : field.help || KIND_LABELS[field.kind]}
                                secondaryTypographyProps={{ variant: 'caption' }}
                              />
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box>
        <Typography variant="caption" color="text.secondary">
          Anything left as extra data is still imported and kept — nothing in your file is thrown away.
        </Typography>
      </Box>
    </Stack>
  );
}
