// The working state (design §10): the run's steps as it reads, encodes, matches, carries, sizes and writes, the
// counts from the files it has read, and what it could not use. Live region: a screen reader hears each step.

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { IconCheck } from '@tabler/icons-react';

import type { Run } from 'api/buying.api';

import { runWords, slowRun, STEP_LABELS, steps } from '../working';

interface Props {
  run: Run;
  windowWords: string;
  counts: string;
  now: Date;
}

export default function WorkingLine({ run, windowWords, counts, now }: Props) {
  const list = steps(run, windowWords);
  const queued = run.status === 'queued' || (run.status === 'running' && !run.step);
  return (
    <Box>
      <Typography
        role="status"
        aria-live="polite"
        sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
      >
        {runWords(run, windowWords)}
      </Typography>
      {queued ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <CircularProgress size={16} />
          <Typography>{STEP_LABELS.queued}</Typography>
        </Box>
      ) : null}
      <Stack spacing={1} component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {list.map((step) => (
          <Box
            component="li"
            key={step.key}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
            aria-current={step.state === 'now' ? 'step' : undefined}
          >
            <Box
              sx={{ width: 18, display: 'flex', justifyContent: 'center', color: step.state === 'done' ? 'success.main' : 'text.disabled' }}
            >
              {step.state === 'done' ? (
                <IconCheck size={16} />
              ) : step.state === 'now' ? (
                <CircularProgress size={14} />
              ) : (
                <span aria-hidden>·</span>
              )}
            </Box>
            <Typography
              color={step.state === 'todo' ? 'text.disabled' : 'text.primary'}
              sx={{ fontWeight: step.state === 'now' ? 600 : 400 }}
            >
              {step.label}
              {step.key === 'reading_catalog' && counts && step.state !== 'todo' ? (
                <Typography component="span" color="text.secondary">
                  {' '}
                  · {counts}
                </Typography>
              ) : null}
            </Typography>
          </Box>
        ))}
      </Stack>
      {slowRun(run, now) ? (
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
          This is taking longer than usual. It keeps going if you leave the page.
        </Typography>
      ) : null}
    </Box>
  );
}
