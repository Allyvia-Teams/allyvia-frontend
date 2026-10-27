// Import data: one drop zone, one table, one report, one Approve (context-graph P1b).
//
// /integrations/import             — a new drop, and the company's recent drops
// /integrations/import/:dropId     — the drop: where each file went and why,
//                                    held store names, the merged report, Approve

import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';

import { PageHeader, Panel, PanelMessage } from 'ui-component/frame';

import ClassificationTable from './ClassificationTable';
import DropReportPanel from './DropReportPanel';
import DropZone from './DropZone';
import EntityQuestions from './EntityQuestions';
import HeldLocations from './HeldLocations';
import HowImportsWork from './HowImportsWork';
import BlockerList from './BlockerList';
import { canApprove, canRetry, dropStatusLabel, headlineCounts, onboardingLaneNote, statusSentence } from './importDrop';
import { useApproveDrop, useCreateDrop, useDrop, useDrops, useReclassify, useStageDrop } from './useImportDrops';

/** The API base the app talks to; the import templates are served from it without auth. */
const API_BASE: string = import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api/v1/';

/** Set by the onboarding entry points while the onboarding import is unavailable on this server. */
export const FROM_ONBOARDING_PARAM = 'from';

function NewDrop() {
  const navigate = useNavigate();
  const create = useCreateDrop();
  const drops = useDrops();
  const [searchParams] = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);
  const fromOnboarding = searchParams.get(FROM_ONBOARDING_PARAM) === 'onboarding';

  return (
    <Stack spacing={3}>
      {fromOnboarding ? (
        <Alert severity="info">
          Files now load straight into Allyvia: customers, products with stock, and sales history. If we can&apos;t tell what a file holds,
          we ask you. Your business profile is in{' '}
          <Link component={RouterLink} to="/settings">
            Settings
          </Link>
          .
        </Alert>
      ) : null}
      <Panel title="New import">
        <Box sx={{ p: 2 }}>
          <DropZone
            uploading={create.isPending}
            progress={progress}
            onSubmit={(files, options) => {
              setProgress(0);
              create.mutate(
                {
                  files,
                  options: {
                    ...options,
                    onUploadProgress: (event) => setProgress(event.total ? Math.round((event.loaded / event.total) * 100) : null)
                  }
                },
                { onSuccess: (drop) => navigate(`/integrations/import/${drop.id}`) }
              );
            }}
          />
        </Box>
      </Panel>
      <Panel title="How imports work">
        <Box sx={{ p: 2 }}>
          <HowImportsWork apiBase={API_BASE} />
        </Box>
      </Panel>
      <Panel title="Recent imports">
        {drops.isLoading ? (
          <PanelMessage>Loading…</PanelMessage>
        ) : drops.isError ? (
          <PanelMessage>Recent imports could not be loaded.</PanelMessage>
        ) : !drops.data?.length ? (
          <PanelMessage>Nothing imported this way yet.</PanelMessage>
        ) : (
          <Stack spacing={1} sx={{ p: 2 }}>
            {drops.data.map((drop) => (
              <Link key={drop.id} component={RouterLink} to={`/integrations/import/${drop.id}`}>
                {new Date(drop.created_at).toLocaleString()} — {drop.files} {drop.files === 1 ? 'file' : 'files'} —{' '}
                {dropStatusLabel(drop.status)}
              </Link>
            ))}
          </Stack>
        )}
      </Panel>
    </Stack>
  );
}

function DropView({ dropId }: { dropId: string }) {
  const query = useDrop(dropId);
  const approve = useApproveDrop();
  const stage = useStageDrop();
  const reclassify = useReclassify();

  if (query.isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (query.isError || !query.data) {
    return <Alert severity="error">This import could not be loaded.</Alert>;
  }
  const drop = query.data;
  const laneNote = onboardingLaneNote(drop);
  const busy = approve.isPending || stage.isPending || reclassify.isPending;

  return (
    <Stack spacing={3}>
      <Alert severity={drop.status === 'completed' ? 'success' : drop.status === 'failed' ? 'error' : 'info'}>
        {statusSentence(drop)} · {headlineCounts(drop)}
      </Alert>

      {laneNote ? (
        <Alert severity="warning">
          <AlertTitle>The onboarding files will not be imported</AlertTitle>
          {laneNote}
        </Alert>
      ) : null}

      <EntityQuestions drop={drop} busy={busy} onAnswer={(fileId, body) => reclassify.mutate({ dropId: drop.id, fileId, ...body })} />

      <Panel title="Where each file goes">
        <ClassificationTable
          drop={drop}
          busy={busy}
          onReclassify={(row, option) =>
            reclassify.mutate({ dropId: drop.id, fileId: row.id, lane: option.lane, entity: option.entity, exclude: option.exclude })
          }
        />
      </Panel>

      {drop.held_locations.length ? (
        <Panel title="Store names to map">
          <Box sx={{ p: 2 }}>
            <HeldLocations drop={drop} />
          </Box>
        </Panel>
      ) : null}

      <Panel title="Report">
        <Box sx={{ p: 2 }}>
          <DropReportPanel drop={drop} />
        </Box>
      </Panel>

      <BlockerList drop={drop} />

      <Stack direction="row" spacing={1}>
        <Button variant="contained" disabled={!canApprove(drop) || busy} onClick={() => approve.mutate(drop.id)}>
          Approve and import
        </Button>
        {canRetry(drop) ? (
          <Button disabled={busy} onClick={() => stage.mutate(drop.id)}>
            Try again
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}

export default function ImportDropPage() {
  const { dropId } = useParams<{ dropId: string }>();
  return (
    <>
      <PageHeader
        title="Import data"
        subtitle="Drop your exports; we sort each file and show one report before anything imports"
        right={
          dropId ? (
            <Button component={RouterLink} to="/integrations/import">
              New import
            </Button>
          ) : undefined
        }
      />
      {dropId ? <DropView dropId={dropId} /> : <NewDrop />}
    </>
  );
}
