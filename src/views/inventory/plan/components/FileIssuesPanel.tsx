// What a drop could not use (design §10): refused files with the server's reason, parked PDF pages, and the one
// question the reader cannot settle alone, whether a bare "Price" column is retail or wholesale.

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { FileIssues } from '../working';

interface Props {
  issues: FileIssues;
  busy: boolean;
  onPriceMeans: (fileId: string, means: 'retail' | 'wholesale') => void;
}

export default function FileIssuesPanel({ issues, busy, onPriceMeans }: Props) {
  if (!issues.refused.length && !issues.parked.length && !issues.askPrice.length && !issues.waiting.length) return null;
  return (
    <Stack spacing={1}>
      {issues.askPrice.map((q) => (
        <Alert key={q.fileId} severity="info">
          <Typography variant="body2">
            In <strong>{q.filename}</strong>, is the &ldquo;{q.column}&rdquo; column the retail price or the wholesale cost?
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button size="small" variant="outlined" disabled={busy} onClick={() => onPriceMeans(q.fileId, 'retail')}>
              Retail price
            </Button>
            <Button size="small" variant="outlined" disabled={busy} onClick={() => onPriceMeans(q.fileId, 'wholesale')}>
              Wholesale cost
            </Button>
          </Box>
        </Alert>
      ))}
      {issues.parked.map((p) => (
        <Alert key={`${p.filename}-${p.page}`} severity="warning">
          Page {p.page} of <strong>{p.filename}</strong>: {p.reason}
        </Alert>
      ))}
      {issues.waiting.map((w, i) => (
        <Alert key={`${w.filename}-w-${i}`} severity="info">
          <strong>{w.filename}</strong>: {w.sentence}
        </Alert>
      ))}
      {issues.refused.map((r, i) => (
        <Alert key={`${r.filename}-${i}`} severity="error">
          <strong>{r.filename}</strong>: {r.sentence}
        </Alert>
      ))}
    </Stack>
  );
}
