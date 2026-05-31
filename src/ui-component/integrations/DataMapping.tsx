import { useEffect, useState } from 'react';
import { Box, Typography, Switch, Table, TableBody, TableCell, TableHead, TableRow, Chip, Alert, CircularProgress } from '@mui/material';
import { useDispatch, useSelector } from 'store';
import { fetchSquareEntityMappings, updateSquareEntityMappings } from 'store/slices/integrations';

interface DataMappingProps {
  source: 'square' | 'quickbooks';
  companyId: string;
}

export default function DataMapping({ source, companyId }: DataMappingProps) {
  const dispatch = useDispatch();
  const entities = useSelector((state) => (source === 'square' ? state.integrations.square.entityMappings : []));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (companyId) {
      dispatch(fetchSquareEntityMappings(companyId));
    }
  }, [dispatch, companyId, source]);

  const handleToggle = async (key: string, enabled: boolean) => {
    setSaving(true);
    const newMappings: Record<string, boolean> = {};
    entities.forEach((e: any) => {
      newMappings[e.key] = e.key === key ? enabled : e.enabled;
    });
    try {
      await dispatch(updateSquareEntityMappings({ companyId, mappings: newMappings }));
    } finally {
      setSaving(false);
    }
  };

  if (!entities || entities.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Data Mapping
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Choose which Square entities to import into Allyvia and where they go. Disabled entities are skipped on the next import.
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Toggling an entity off prevents future imports of that data. Already-imported records are not removed.
      </Alert>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Source Entity</TableCell>
            <TableCell>Destination</TableCell>
            <TableCell align="right">Records</TableCell>
            <TableCell align="center">Import Enabled</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entities.map((e: any) => (
            <TableRow key={e.key}>
              <TableCell>{e.label}</TableCell>
              <TableCell>
                <Chip label={e.destination} size="small" variant="outlined" />
              </TableCell>
              <TableCell align="right">{e.count}</TableCell>
              <TableCell align="center">
                <Switch checked={e.enabled} onChange={(ev) => handleToggle(e.key, ev.target.checked)} disabled={saving} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
