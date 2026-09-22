import { useEffect, useState } from 'react';

import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconTrash } from '@tabler/icons-react';

import type { IngestPhase, OnboardingState } from 'api/onboarding.api';
import ConfirmDelete from 'ui-component/common/ConfirmDelete';
import UploadDropzone from '../components/UploadDropzone';
import { useDeleteSource } from '../hooks/useOnboardingQueries';
import { useUploadFlow } from '../hooks/useUploadFlow';
import { canDeleteSource, jobsForSource } from '../wizardState';

const PHASE_LABELS: Record<IngestPhase, string> = {
  landed: 'Landed',
  ingesting: 'Ingesting',
  await_map: 'Needs review',
  mapping_confirmed: 'Confirmed',
  normalizing: 'Normalizing',
  done: 'Done',
  failed: 'Failed'
};

const PHASE_COLORS: Partial<Record<IngestPhase, 'success' | 'error' | 'warning'>> = {
  done: 'success',
  failed: 'error',
  await_map: 'warning'
};

interface Step3UploadProps {
  state: OnboardingState | undefined;
}

export default function Step3Upload({ state }: Step3UploadProps) {
  const { items, enqueue, retry } = useUploadFlow(state);

  // Tick while any item waits on the ingest callback so the "still
  // processing" note can appear without new data arriving.
  const [now, setNow] = useState(() => Date.now());
  const anyWaiting = items.some((item) => item.status === 'waiting_job');
  useEffect(() => {
    if (!anyWaiting) return;
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, [anyWaiting]);

  const activeSourceIds = new Set(items.map((item) => item.sourceId).filter(Boolean));
  const previousSources = (state?.sources ?? []).filter((source) => source.kind === 'upload' && !activeSourceIds.has(source.id));

  const deleteMutation = useDeleteSource();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Upload CSV, XLSX, or NDJSON exports. Each file is loaded raw first — you&apos;ll review how its columns map to Allyvia in the next
        step.
      </Typography>

      <UploadDropzone items={items} onFiles={enqueue} onRetry={retry} now={now} />

      {previousSources.length > 0 && (
        <Stack spacing={1}>
          <Divider />
          <Typography variant="subtitle2">Previously uploaded</Typography>
          {previousSources.map((source) => {
            const jobs = state ? jobsForSource(state, source.id) : [];
            const job = jobs[0];
            const filename = typeof source.config?.filename === 'string' ? source.config.filename : `Upload ${source.id.slice(0, 8)}`;
            return (
              <Stack key={source.id} direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {filename}
                </Typography>
                {job ? (
                  <Chip size="small" variant="outlined" color={PHASE_COLORS[job.phase]} label={PHASE_LABELS[job.phase]} />
                ) : (
                  <Chip size="small" variant="outlined" label="No data received" />
                )}
                {canDeleteSource(source) && (
                  <Tooltip title="Delete this file and everything imported from it">
                    <IconButton
                      size="small"
                      aria-label={`Delete ${filename}`}
                      disabled={deleteMutation.isPending}
                      onClick={() => setDeleteTarget({ id: source.id, name: filename })}
                    >
                      <IconTrash size={16} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            );
          })}
        </Stack>
      )}

      <ConfirmDelete
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
        loading={deleteMutation.isPending}
        title="Delete this file?"
        itemName={deleteTarget?.name}
        message={
          'This removes the file, every table imported from it, and the rows it contributed to your ' +
          'warehouse. Mappings you have taught Allyvia are kept, so re-uploading the same file will ' +
          'map itself. This cannot be undone.'
        }
      />
    </Stack>
  );
}
