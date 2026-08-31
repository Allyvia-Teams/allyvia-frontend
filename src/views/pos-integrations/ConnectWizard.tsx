// Screen 2 — the connect wizard.
//
// Four steps: pick how it should work, upload files, check the mapping, start.
// The mapping-review step is the one that earns the whole design — it is where
// a guess becomes a confirmation, and it is why the synonym table is allowed to
// be aggressive.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import MainCard from 'ui-component/cards/MainCard';
import type { ConnectionMode, CsvEntity, DateOrder, Provider } from 'api/posIntegrations.api';
import { ENTITY_LABELS, PROVIDER_LABELS } from 'api/posIntegrations.api';
import FileUploadStep from './components/FileUploadStep';
import MappingReviewTable from './components/MappingReviewTable';
import {
  useAuthorize,
  useConfirmMapping,
  useConnection,
  useConnections,
  useCreateConnection,
  useMapping,
  useStartRun,
  useUploadFiles
} from './hooks/usePosIntegrations';

const CSV_STEPS = ['How it works', 'Your files', 'Check the columns', 'Import'];
// An OAuth provider has no files and no columns to check: the merchant approves
// access at the provider and comes straight back to the import step.
const OAUTH_STEPS = ['How it works', 'Sign in', 'Import'];

export default function ConnectWizard() {
  const { provider } = useParams<{ provider: Provider }>();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<ConnectionMode>('one_time');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [pending, setPending] = useState<Partial<Record<CsvEntity, File>>>({});
  const [entityTab, setEntityTab] = useState(0);
  // Local mapping edits, keyed by entity, until the merchant confirms them.
  const [edits, setEdits] = useState<Record<string, { targets: Record<string, string>; date_order: DateOrder }>>({});

  // CSV is the only provider that uploads anything; everything else connects
  // by OAuth and never asks the merchant for a field.
  const isOauth = provider !== 'csv';
  const STEPS = isOauth ? OAUTH_STEPS : CSV_STEPS;

  const { data: connections } = useConnections();
  const createConnection = useCreateConnection();
  const { data: connection } = useConnection(connectionId ?? undefined);
  const uploadFiles = useUploadFiles(connectionId ?? '');
  const authorize = useAuthorize(connectionId ?? '');
  const { data: mapping, isLoading: mappingLoading } = useMapping(connectionId ?? undefined, step >= 2);
  const confirmMapping = useConfirmMapping(connectionId ?? '');
  const startRun = useStartRun(connectionId ?? '');

  // Reuse an existing connection for this provider rather than creating a
  // second one — the backend refuses a duplicate anyway, and re-importing into
  // the same connection is what keeps RecordLink idempotency working.
  useEffect(() => {
    if (connectionId || !connections || !provider) return;
    const existing = connections.find((c) => c.provider === provider && c.status !== 'disconnected');
    if (existing) {
      setConnectionId(existing.id);
      setMode(existing.mode);
    }
  }, [connections, connectionId, provider]);

  // Coming back from the provider's consent screen: the connection is already
  // authorized, so skip straight to the last step rather than making the
  // merchant walk the wizard again to reach a button.
  useEffect(() => {
    if (!isOauth || !connection) return;
    if (connection.status === 'active' && step < 3) setStep(3);
  }, [isOauth, connection, step]);

  const entities = useMemo(() => (mapping ? (Object.keys(mapping.files) as CsvEntity[]) : []), [mapping]);
  const activeEntity = entities[Math.min(entityTab, Math.max(entities.length - 1, 0))];
  const activeProposal = activeEntity ? mapping?.files[activeEntity] : undefined;

  // Seed local edits from the server's proposal the first time we see a file.
  useEffect(() => {
    if (!mapping) return;
    setEdits((prev) => {
      const next = { ...prev };
      (Object.entries(mapping.files) as Array<[CsvEntity, NonNullable<typeof activeProposal>]>).forEach(([entity, proposal]) => {
        if (next[entity]) return;
        next[entity] = {
          targets: Object.fromEntries(proposal.columns.map((c) => [c.header, c.target])),
          // An ambiguous file gets no silent default: the radio starts
          // unselected-equivalent at mdy but the alert insists on a choice.
          date_order: proposal.date_order === 'ambiguous' ? 'mdy' : proposal.date_order
        };
      });
      return next;
    });
  }, [mapping]);

  const handleStart = async () => {
    if (!provider) return;
    if (connectionId) {
      setStep(1);
      return;
    }
    const created = await createConnection.mutateAsync({ provider, mode });
    setConnectionId(created.id);
    setStep(1);
  };

  const handleSignIn = async () => {
    if (!connectionId) return;
    const { authorize_url: url } = await authorize.mutateAsync();
    // A full navigation, not a popup: the provider's consent screen refuses to
    // render in a frame, and a popup is the thing browsers block.
    window.location.assign(url);
  };

  const handleUpload = async () => {
    if (!connectionId) return;
    // Nothing new to send: the merchant is continuing with files they uploaded
    // earlier, so skip the round trip rather than POSTing an empty body.
    if (Object.keys(pending).length) {
      await uploadFiles.mutateAsync(pending);
      setPending({});
      setEdits({});
    }
    setStep(2);
  };

  const handleConfirmAll = async () => {
    if (!connectionId) return;
    for (const entity of entities) {
      const edit = edits[entity];
      if (!edit) continue;
      await confirmMapping.mutateAsync({ entity, targets: edit.targets, date_order: edit.date_order });
    }
    setStep(3);
  };

  const handleImport = async () => {
    const run = await startRun.mutateAsync();
    navigate(`/integrations/pos/runs/${run.id}`);
  };

  const uploadedCount = Object.keys(connection?.files ?? {}).length;
  const providerLabel = connection?.provider_label ?? PROVIDER_LABELS[provider ?? 'csv'] ?? 'your old system';
  // Named rather than counted: "across Main Street and Airport Kiosk" is what
  // tells a multi-store merchant we found all of their shops.
  const locations = Object.values(connection?.locations ?? {});
  const locationSummary = locations.length ? ` across ${locations.join(', ')}` : '';

  return (
    <MainCard title="Connect and import">
      <Stack spacing={3}>
        <Stepper activeStep={isOauth ? Math.min(step, 2) : step} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Divider />

        {step === 0 && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              A one-time import brings everything across once. Ongoing sync keeps reading from your old system so you can run both side by
              side — only available for systems Allyvia can connect to directly.
            </Typography>
            <RadioGroup value={mode} onChange={(event) => setMode(event.target.value as ConnectionMode)}>
              <FormControlLabel value="one_time" control={<Radio />} label="One-time import" />
              <FormControlLabel
                value="ongoing"
                control={<Radio />}
                disabled={provider === 'csv'}
                label={provider === 'csv' ? 'Keep in sync (not available for spreadsheet imports)' : 'Keep in sync after the first import'}
              />
            </RadioGroup>
            <Box>
              <Button variant="contained" onClick={handleStart} disabled={createConnection.isPending}>
                Continue
              </Button>
            </Box>
          </Stack>
        )}

        {step === 1 && connectionId && isOauth && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              You’ll sign in to {providerLabel} and approve read-only access. Allyvia never gets permission to change anything in your old
              system — we only read your customers, catalogue, stock and sales history.
            </Typography>
            <Box>
              <Button variant="contained" onClick={handleSignIn} disabled={authorize.isPending}>
                {authorize.isPending ? 'Opening…' : `Sign in to ${providerLabel}`}
              </Button>
            </Box>
          </Stack>
        )}

        {step === 1 && connectionId && !isOauth && (
          <FileUploadStep
            existing={connection?.files ?? {}}
            pending={pending}
            uploading={uploadFiles.isPending}
            onFile={(entity, file) => setPending((prev) => ({ ...prev, [entity]: file }))}
            onUpload={handleUpload}
          />
        )}

        {step === 2 && !isOauth && (
          <Stack spacing={2}>
            {mappingLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {!mappingLoading && !entities.length && (
              <Alert severity="warning">
                No files yet.{' '}
                <Button size="small" onClick={() => setStep(1)}>
                  Go back and upload one
                </Button>
              </Alert>
            )}

            {entities.length > 0 && (
              <>
                <Typography variant="body2" color="text.secondary">
                  Here’s how we read each column. Change anything we got wrong — nothing is imported until you’ve confirmed this.
                </Typography>
                <Tabs
                  value={Math.min(entityTab, entities.length - 1)}
                  onChange={(_event, value) => setEntityTab(value)}
                  variant="scrollable"
                >
                  {entities.map((entity) => (
                    <Tab key={entity} label={ENTITY_LABELS[entity] ?? entity} />
                  ))}
                </Tabs>

                {activeProposal && activeEntity && edits[activeEntity] && (
                  <MappingReviewTable
                    proposal={activeProposal}
                    fields={mapping?.fields[activeEntity] ?? []}
                    targets={edits[activeEntity].targets}
                    dateOrder={edits[activeEntity].date_order}
                    disabled={confirmMapping.isPending}
                    onTargetChange={(header, target) =>
                      setEdits((prev) => ({
                        ...prev,
                        [activeEntity]: {
                          ...prev[activeEntity],
                          targets: { ...prev[activeEntity].targets, [header]: target }
                        }
                      }))
                    }
                    onDateOrderChange={(order) =>
                      setEdits((prev) => ({
                        ...prev,
                        [activeEntity]: { ...prev[activeEntity], date_order: order }
                      }))
                    }
                  />
                )}

                <Stack direction="row" spacing={1}>
                  <Button onClick={() => setStep(1)}>Back</Button>
                  <Button variant="contained" onClick={handleConfirmAll} disabled={confirmMapping.isPending}>
                    {confirmMapping.isPending ? 'Saving…' : 'These look right'}
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        )}

        {step === 3 && (
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h4" gutterBottom>
                  Ready to read your data
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isOauth ? (
                    <>
                      We’ll read your {providerLabel} customers, catalogue, stock and sales history{locationSummary}, check everything, and
                      show you a summary.
                    </>
                  ) : (
                    <>
                      We’ll read {uploadedCount} file{uploadedCount === 1 ? '' : 's'}, check everything, and show you a summary.
                    </>
                  )}{' '}
                  <strong>Nothing is written to Allyvia yet</strong> — you’ll approve the summary first.
                </Typography>
              </CardContent>
            </Card>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => setStep(isOauth ? 1 : 2)}>Back</Button>
              <Button variant="contained" onClick={handleImport} disabled={startRun.isPending}>
                {startRun.isPending ? 'Starting…' : 'Read my data'}
              </Button>
            </Stack>
          </Stack>
        )}
      </Stack>
    </MainCard>
  );
}
