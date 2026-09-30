// Why Approve is off, as sentences (context-graph P1b).

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import type { BulkDrop } from 'api/importDrops.api';

import { blockersFor } from './importDrop';

export default function BlockerList({ drop }: { drop: BulkDrop }) {
  const sentences = blockersFor(drop);
  if (!sentences.length) return null;
  return (
    <Alert severity="warning">
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Not ready to approve yet
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {sentences.map((sentence) => (
          <li key={sentence}>
            <Typography variant="body2">{sentence}</Typography>
          </li>
        ))}
      </Box>
    </Alert>
  );
}
