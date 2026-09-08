// Merge-or-create, per matched record.
//
// The default is the pipeline's proposal, which is deliberately asymmetric:
// an exact email or SKU match defaults to merging, a shared phone or barcode
// only asks. Households share phone numbers and a manufacturer barcode can
// cover several variants — defaulting those to merge would quietly fuse
// records that are genuinely different.

import { useMemo, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import type { DuplicateGroup } from 'api/posIntegrations.api';
import { ENTITY_LABELS } from 'api/posIntegrations.api';

type Action = 'merge' | 'create';

const MATCH_LABELS: Record<string, string> = {
  email: 'Same email',
  phone: 'Same phone',
  sku: 'Same SKU',
  barcode: 'Same barcode'
};

interface Props {
  groups: DuplicateGroup[];
  disabled?: boolean;
  saving?: boolean;
  onSave: (decisions: Array<{ staged_record_id: number; action: Action }>) => void;
}

export default function DuplicateResolver({ groups, disabled, saving, onSave }: Props) {
  const defaults = useMemo(() => {
    const map: Record<number, Action> = {};
    groups.forEach((group) => {
      // "review" is not a decision — it is the absence of one, and the safe
      // reading of "we're not sure these are the same" is to keep them apart.
      map[group.staged_record_id] = group.proposed_action === 'merge' ? 'merge' : 'create';
    });
    return map;
  }, [groups]);

  const [choices, setChoices] = useState<Record<number, Action>>(defaults);

  if (!groups.length) return null;

  const setAll = (action: Action) => {
    const next: Record<number, Action> = {};
    groups.forEach((group) => {
      next[group.staged_record_id] = action;
    });
    setChoices(next);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Possible duplicates ({groups.length})
      </Typography>
      <Stack spacing={2}>
        <Alert severity="info">
          These records look like things you already have in Allyvia. <strong>Merge</strong> updates the existing record and never deletes
          what it already knows; <strong>Keep separate</strong> creates a new one.
        </Alert>

        <Stack direction="row" spacing={1}>
          <Button size="small" disabled={disabled} onClick={() => setAll('merge')}>
            Merge all
          </Button>
          <Button size="small" disabled={disabled} onClick={() => setAll('create')}>
            Keep all separate
          </Button>
        </Stack>

        <TableContainer sx={{ maxHeight: 420 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>From your export</TableCell>
                <TableCell>Already in Allyvia</TableCell>
                <TableCell>Matched on</TableCell>
                <TableCell align="right">What should we do?</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.staged_record_id} hover>
                  <TableCell>
                    <Typography variant="body2">{group.incoming_label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ENTITY_LABELS[group.entity] ?? group.entity} · {group.external_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{group.existing_label ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{MATCH_LABELS[group.match_field ?? ''] ?? group.match_field}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {group.match_value}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      disabled={disabled}
                      value={choices[group.staged_record_id] ?? 'create'}
                      onChange={(_event, value: Action | null) => {
                        if (value) setChoices((prev) => ({ ...prev, [group.staged_record_id]: value }));
                      }}
                    >
                      <ToggleButton value="merge">Merge</ToggleButton>
                      <ToggleButton value="create">Keep separate</ToggleButton>
                    </ToggleButtonGroup>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box>
          <Button
            variant="outlined"
            disabled={disabled || saving}
            onClick={() =>
              onSave(
                groups.map((group) => ({
                  staged_record_id: group.staged_record_id,
                  action: choices[group.staged_record_id] ?? 'create'
                }))
              )
            }
          >
            {saving ? 'Saving…' : 'Save these choices'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
