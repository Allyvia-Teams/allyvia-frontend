import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { getJob } from 'api/onboarding.api';
import type { FieldMappings, IngestionJobDetail, OnboardingRegistry, OnboardingState, StagedTableSummary } from 'api/onboarding.api';
import ConfirmActionDialog from 'ui-component/common/ConfirmActionDialog';
import ConfidenceBadge from '../components/ConfidenceBadge';
import MappingTable from '../components/MappingTable';
import {
  applyTargetChange,
  buildPatchPayload,
  buildRows,
  compositePairs,
  compositePartners as compositePartnerMap,
  missingRequiredFields,
  remapForEntity,
  targetOptions,
  validateMappings
} from '../mapping';
import { tableDisplayName, type WizardStep } from '../wizardState';
import {
  useConfirmProposal,
  useProposal,
  useProposeMapping,
  useStagedTablePreview,
  useUpdateProposal
} from '../hooks/useOnboardingQueries';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

const MAPPABLE_PHASES = ['await_map', 'mapping_confirmed', 'normalizing', 'done'];

const snack = (message: string, color: 'success' | 'error' | 'info' | 'warning') =>
  dispatch(
    openSnackbar({
      open: true,
      message,
      variant: 'alert',
      alert: { color },
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      close: true
    })
  );

// Split a 400 detail dict into per-column errors (rendered under the row's
// Select) and summary errors (proposed_entity / required / field_mappings).
const splitDetail = (detail: Record<string, string>, columns: string[]) => {
  const columnSet = new Set(columns);
  const columnErrors: Record<string, string> = {};
  const summary: string[] = [];
  for (const [key, message] of Object.entries(detail)) {
    if (columnSet.has(key)) columnErrors[key] = message;
    else summary.push(message);
  }
  return { columnErrors, summary };
};

interface TablePanelProps {
  job: IngestionJobDetail;
  table: StagedTableSummary;
  state: OnboardingState;
  registry: OnboardingRegistry;
  otherUnconfirmedCount: number;
  goToStep: (step: WizardStep) => void;
}

function TablePanel({ job, table, state, registry, otherUnconfirmedCount, goToStep }: TablePanelProps) {
  const proposeMutation = useProposeMapping();
  const proposedRef = useRef(false);

  // Propose once per table (idempotent server-side: 201 first, 200 after).
  useEffect(() => {
    if (table.proposal_id === null && !proposedRef.current) {
      proposedRef.current = true;
      proposeMutation.mutate(table);
    }
  }, [table.proposal_id, table.id]);

  const proposalId = table.proposal_id ?? proposeMutation.data?.id;
  const proposalQuery = useProposal(proposalId);
  const previewQuery = useStagedTablePreview(table.id);
  const updateMutation = useUpdateProposal(proposalId);
  const confirmMutation = useConfirmProposal(proposalId, table.job);

  const [pendingChange, setPendingChange] = useState<{ column: string; target: string } | null>(null);
  const [serverDetail, setServerDetail] = useState<Record<string, string>>({});
  const [entityDialog, setEntityDialog] = useState<{ entity: string; fieldMappings: FieldMappings; resetColumns: string[] } | null>(null);

  const proposal = proposalQuery.data;
  const columns = useMemo(() => table.autodetected_schema.map((field) => field.name), [table.autodetected_schema]);

  if (proposeMutation.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              proposeMutation.reset();
              proposeMutation.mutate(table);
            }}
          >
            Retry
          </Button>
        }
      >
        We couldn&apos;t analyze this table&apos;s columns. Retry to generate a mapping proposal.
      </Alert>
    );
  }

  if (!proposal) {
    return (
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Analyzing columns…
          </Typography>
        </Stack>
        <Skeleton variant="rounded" height={40} />
        <Skeleton variant="rounded" height={40} />
        <Skeleton variant="rounded" height={40} />
      </Stack>
    );
  }

  const readOnly = proposal.status !== 'proposed';
  const entity = proposal.proposed_entity;
  const rows = buildRows(table.autodetected_schema, proposal, previewQuery.data, registry);
  // Composite members (date + time -> one TIMESTAMP field) render a chip on
  // BOTH rows naming the partner, so the pairing is visible from either side.
  const compositePartners = compositePartnerMap(compositePairs(entity, proposal.field_mappings, rows, registry));
  const groups = targetOptions(registry, entity);
  const clientErrors = validateMappings(
    entity,
    buildPatchPayload(entity, proposal.field_mappings, columns).field_mappings!,
    columns,
    registry,
    rows
  );
  const missingRequired = missingRequiredFields(entity, proposal.field_mappings, registry);
  const { columnErrors, summary } = splitDetail(serverDetail, columns);
  const mutationPending = updateMutation.isPending || confirmMutation.isPending;

  const patch = (nextEntity: string, nextMappings: FieldMappings, pending: { column: string; target: string } | null) => {
    setServerDetail({});
    setPendingChange(pending);
    updateMutation.mutate(buildPatchPayload(nextEntity, nextMappings, columns), {
      onSettled: () => setPendingChange(null),
      onError: (error: any) => {
        const detail = error?.response?.data?.detail;
        if (error?.response?.status === 400 && detail && typeof detail === 'object') {
          setServerDetail(detail);
        } else {
          snack(error?.response?.data?.error || 'Could not save the mapping change.', 'error');
        }
      }
    });
  };

  const handleTargetChange = (column: string, target: string) => {
    if (readOnly || mutationPending) return;
    const nextMappings = applyTargetChange(proposal.field_mappings, column, target);
    const fullMappings = buildPatchPayload(entity, nextMappings, columns).field_mappings!;
    // `rows` carries rawType + samples, which is what lets a LEGAL composite
    // (date + time -> a TIMESTAMP field) through instead of being blocked as a
    // duplicate before the PATCH is ever sent.
    const errors = validateMappings(entity, fullMappings, columns, registry, rows);
    if (errors[column]) {
      // A duplicate non-sentinel target blocks the PATCH; the Select reverts
      // because its value always comes from the server proposal.
      snack(errors[column], 'error');
      return;
    }
    patch(entity, nextMappings, { column, target });
  };

  const handleEntityChange = (newEntity: string) => {
    if (readOnly || mutationPending || newEntity === entity) return;
    const remapped = remapForEntity(proposal.field_mappings, registry, newEntity);
    if (remapped.resetColumns.length > 0) {
      setEntityDialog({ entity: newEntity, fieldMappings: remapped.fieldMappings, resetColumns: remapped.resetColumns });
    } else {
      patch(newEntity, remapped.fieldMappings, null);
    }
  };

  const handleConfirm = () => {
    setServerDetail({});
    confirmMutation.mutate(undefined, {
      onSuccess: () => {
        if (otherUnconfirmedCount === 0) {
          snack('All tables confirmed — normalization started.', 'success');
          goToStep(5);
        } else {
          snack('Mapping confirmed.', 'success');
        }
      },
      onError: (error: any) => {
        const status = error?.response?.status;
        if (status === 409) {
          // Already confirmed elsewhere — idempotent success.
          snack('This mapping was already confirmed.', 'info');
          return;
        }
        const detail = error?.response?.data?.detail;
        if (status === 400 && detail && typeof detail === 'object') {
          setServerDetail(detail);
        } else {
          snack(error?.response?.data?.error || 'Could not confirm the mapping.', 'error');
        }
      }
    });
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
          <Typography variant="subtitle2">Entity</Typography>
          <Select
            size="small"
            value={entity || ''}
            disabled={readOnly || mutationPending}
            onChange={(e) => handleEntityChange(e.target.value)}
          >
            {Object.values(registry.entities).map((entityDef) => (
              <MenuItem key={entityDef.name} value={entityDef.name}>
                <Tooltip title={entityDef.description} placement="right">
                  <span>{entityDef.name}</span>
                </Tooltip>
              </MenuItem>
            ))}
          </Select>
          <ConfidenceBadge confidence={proposal.confidence} />
        </Stack>
        {readOnly ? (
          <Chip size="small" color="success" variant="outlined" label="Confirmed" />
        ) : (
          <Button
            variant="contained"
            disabled={Object.keys(clientErrors).length > 0 || mutationPending}
            startIcon={confirmMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={handleConfirm}
          >
            Confirm mapping
          </Button>
        )}
      </Stack>

      {previewQuery.isError && (
        <Alert
          severity={(previewQuery.error as any)?.response?.status === 404 ? 'warning' : 'error'}
          action={
            <Button color="inherit" size="small" onClick={() => previewQuery.refetch()}>
              Retry
            </Button>
          }
        >
          {(previewQuery.error as any)?.response?.status === 404
            ? 'The raw table no longer exists — re-upload the file to preview sample values.'
            : "Couldn't load sample values from BigQuery. Mapping still works without them."}
        </Alert>
      )}

      {!readOnly && missingRequired.length > 0 && (
        <Alert severity="warning">
          Required {entity} field{missingRequired.length === 1 ? '' : 's'} not mapped: {missingRequired.join(', ')}
        </Alert>
      )}

      {(summary.length > 0 || clientErrors.field_mappings || clientErrors.proposed_entity) && (
        <Alert severity="error">{[...summary, clientErrors.field_mappings, clientErrors.proposed_entity].filter(Boolean).join(' ')}</Alert>
      )}

      <MappingTable
        rows={rows}
        groups={groups}
        previewRows={previewQuery.data?.rows ?? []}
        disabled={readOnly || mutationPending}
        pendingChange={pendingChange}
        errors={{ ...clientErrors, ...columnErrors }}
        compositePartners={compositePartners}
        onTargetChange={handleTargetChange}
      />

      <ConfirmActionDialog
        open={entityDialog !== null}
        onClose={() => setEntityDialog(null)}
        onConfirm={() => {
          if (entityDialog) patch(entityDialog.entity, entityDialog.fieldMappings, null);
          setEntityDialog(null);
        }}
        title="Switch entity?"
        message={
          entityDialog
            ? `Switching to "${entityDialog.entity}" will unmap ${entityDialog.resetColumns.length} column${
                entityDialog.resetColumns.length === 1 ? '' : 's'
              } (kept as extra): ${entityDialog.resetColumns.join(', ')}`
            : ''
        }
        confirmLabel="Switch entity"
        variant="warning"
      />
    </Stack>
  );
}

interface Step4ReviewMapProps {
  state: OnboardingState | undefined;
  registry: OnboardingRegistry | undefined;
  goToStep: (step: WizardStep) => void;
}

export default function Step4ReviewMap({ state, registry, goToStep }: Step4ReviewMapProps) {
  const eligibleJobs = useMemo(
    () =>
      [...(state?.jobs ?? [])]
        .filter((job) => MAPPABLE_PHASES.includes(job.phase))
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)),
    [state]
  );

  // One detail query per eligible job — shares cache keys with useJobDetail.
  const detailQueries = useQueries({
    queries: eligibleJobs.map((job) => ({
      queryKey: ['onboarding-job', job.id],
      queryFn: () => getJob(job.id),
      staleTime: 3_000
    }))
  });

  const tabs: Array<{ job: IngestionJobDetail; table: StagedTableSummary }> = [];
  for (const query of detailQueries) {
    const detail = query.data as IngestionJobDetail | undefined;
    if (!detail) continue;
    for (const table of detail.staged_tables) {
      tabs.push({ job: detail, table });
    }
  }

  const [selected, setSelected] = useState(0);
  const selectedIndex = Math.min(selected, Math.max(tabs.length - 1, 0));
  const current = tabs[selectedIndex];

  if (!state || !registry) {
    return <Skeleton variant="rounded" height={240} />;
  }

  if (eligibleJobs.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Nothing to map yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload a file and it will appear here once its columns are ready to review.
        </Typography>
        <Button variant="contained" onClick={() => goToStep(3)}>
          Upload files
        </Button>
      </Box>
    );
  }

  if (tabs.length === 0) {
    return <Skeleton variant="rounded" height={240} />;
  }

  const otherUnconfirmedCount = tabs.filter(
    (entry) => entry.table.id !== current?.table.id && entry.table.proposal_status !== 'confirmed'
  ).length;

  return (
    <Stack spacing={2}>
      <Tabs value={selectedIndex} onChange={(_event, value) => setSelected(value)} variant="scrollable" scrollButtons="auto">
        {tabs.map((entry) => (
          <Tab
            key={entry.table.id}
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>{tableDisplayName(state, entry.job, entry.table)}</span>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: entry.table.proposal_status === 'confirmed' ? 'success.main' : 'warning.main'
                  }}
                />
              </Stack>
            }
          />
        ))}
      </Tabs>

      {current && (
        <TablePanel
          key={current.table.id}
          job={current.job}
          table={current.table}
          state={state}
          registry={registry}
          otherUnconfirmedCount={otherUnconfirmedCount}
          goToStep={goToStep}
        />
      )}
    </Stack>
  );
}
