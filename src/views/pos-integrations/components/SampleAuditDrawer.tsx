// Twenty random records per kind, raw next to normalized.
//
// The point is eyeball verification: seeing that "$1,234.56" in the export
// became 1234.56 here, field by field, on records nobody chose. The sample is
// random rather than the first twenty precisely because the first rows of an
// export are the ones most likely to be clean — a sample that only shows easy
// cases manufactures confidence instead of earning it.

import { useState } from 'react';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';

import type { SampleRow } from 'api/posIntegrations.api';
import { ENTITY_LABELS } from 'api/posIntegrations.api';

const pretty = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

function Pane({ title, value }: { title: string; value: unknown }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          mt: 0.5,
          p: 1.5,
          fontSize: 12,
          lineHeight: 1.5,
          bgcolor: 'grey.100',
          borderRadius: 1,
          overflow: 'auto',
          maxHeight: 320,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {pretty(value)}
      </Box>
    </Box>
  );
}

interface Props {
  open: boolean;
  samples: Record<string, SampleRow[]>;
  onClose: () => void;
}

export default function SampleAuditDrawer({ open, samples, onClose }: Props) {
  const entities = Object.keys(samples);
  const [tab, setTab] = useState(0);
  const active = entities[Math.min(tab, entities.length - 1)];
  const rows = active ? samples[active] : [];

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', md: 720 }, p: 2 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h4">Spot check</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
        A random handful of records, showing exactly what was in your file and what we made of it.
      </Typography>

      {entities.length > 0 && (
        <Tabs value={Math.min(tab, entities.length - 1)} onChange={(_e, value) => setTab(value)} variant="scrollable">
          {entities.map((entity) => (
            <Tab key={entity} label={ENTITY_LABELS[entity] ?? entity} />
          ))}
        </Tabs>
      )}

      <Stack spacing={2} sx={{ mt: 2 }}>
        {rows.map((row) => (
          <Box key={row.external_id}>
            <Typography variant="subtitle2" gutterBottom>
              {row.external_id}
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <Pane title="In your file" value={row.raw} />
              <Pane title="As Allyvia read it" value={row.normalized} />
            </Stack>
            <Divider sx={{ mt: 2 }} />
          </Box>
        ))}
        {!rows.length && (
          <Typography variant="body2" color="text.secondary">
            Nothing to show yet.
          </Typography>
        )}
      </Stack>
    </Drawer>
  );
}
