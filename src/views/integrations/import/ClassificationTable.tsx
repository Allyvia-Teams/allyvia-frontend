// One row per dropped file: where it goes and why, in one sentence.

import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { BulkDrop } from 'api/importDrops.api';

import { reclassifyOptions, rowsFor, type DropRow, type ReclassifyOption } from './importDrop';

const TONE_COLOR: Record<DropRow['tone'], 'primary' | 'secondary' | 'default'> = {
  direct: 'primary',
  onboarding: 'secondary',
  refused: 'default'
};

interface Props {
  drop: BulkDrop;
  onReclassify?: (row: DropRow, option: ReclassifyOption) => void;
  busy?: boolean;
}

function RowMenu({ drop, row, onReclassify, busy }: { drop: BulkDrop; row: DropRow } & Pick<Props, 'onReclassify' | 'busy'>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const options = reclassifyOptions(drop, row.file);
  if (!options.length || !onReclassify) return null;
  return (
    <>
      <Button size="small" disabled={busy} onClick={(event) => setAnchor(event.currentTarget)}>
        Change
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {options.map((option) => (
          <MenuItem
            key={option.label}
            onClick={() => {
              setAnchor(null);
              onReclassify(row, option);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default function ClassificationTable({ drop, onReclassify, busy }: Props) {
  const rows = rowsFor(drop);
  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>File</TableCell>
            <TableCell>Goes to</TableCell>
            <TableCell>Holds</TableCell>
            <TableCell align="right">Confidence</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Why</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Typography variant="body2">{row.displayName}</Typography>
                {row.containerName ? (
                  <Typography variant="caption" color="text.secondary">
                    in {row.containerName}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell>
                <Chip size="small" variant="outlined" color={TONE_COLOR[row.tone]} label={row.laneLabel} />
              </TableCell>
              <TableCell>{row.entityLabel}</TableCell>
              <TableCell align="right">{row.confidenceLabel}</TableCell>
              <TableCell>
                {row.mappingLink ? (
                  <Link component={RouterLink} to={row.mappingLink}>
                    {row.statusLabel}
                  </Link>
                ) : (
                  row.statusLabel
                )}
              </TableCell>
              <TableCell sx={{ minWidth: 320 }}>
                <Typography variant="body2" color="text.secondary">
                  {row.reason}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <RowMenu drop={drop} row={row} onReclassify={onReclassify} busy={busy} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
