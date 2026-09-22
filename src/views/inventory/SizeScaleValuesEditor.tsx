// views/inventory/SizeScaleValuesEditor.tsx
//
// The ordered-values editor for one scale: per-row up/down MOVE BUTTONS, an
// active toggle, remove, and an add field — saved as one whole-list PUT.
//
// DELIBERATE DEVIATION FROM THE SPEC'S "drag-to-reorder": reordering is done
// with per-row up/down buttons. The repo has no drag-and-drop dependency and
// one screen does not justify adding one; the spec's intent — reorder writes
// `position` — is fully satisfied, since the PUT derives positions from list
// order either way. If DnD ever arrives for another screen, this editor's
// moveEntry seam is where it plugs in.
//
// THE RESURRECT TRAP LIVES HERE. The PUT accepts plain strings, and a plain
// string means is_active=true — so every draft row carries its {value,
// is_active} pair from the fetched payload and the body is built ONLY by
// toValuesPutPayload, which emits the object form unconditionally. See the
// mutation-proven tests in sizeScales.test.ts.
//
// Removing a referenced value answers 409 with one blocker PER value, matched
// here by (axis_index, value) — never by array position, because the server
// appends blockers only for values that failed. Deactivating a referenced
// value succeeds (200) with warnings; both are rendered beside their rows.

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  Grid,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-react';

import { replaceSizeScaleValues } from 'api/sizeScales.api';

import {
  DEACTIVATE_INSTEAD_HINT,
  ScaleValueWarning,
  SizeScale,
  SizeScaleBlocker,
  ValueDraft,
  addValueDraft,
  axisTitle,
  blockerForValue,
  draftsDiffer,
  moveEntry,
  parseSizeScaleError,
  removeDraft,
  setDraftActive,
  toValueDrafts,
  toValuesPutPayload,
  validateNewValue,
  warningForValue
} from './sizeScales';

interface Props {
  scale: SizeScale;
  isAdmin: boolean;
  nonAdminNotice: string;
  /** Called with the PUT's response so the parent list stays fresh. */
  onSaved: (scale: SizeScale) => void;
}

export default function SizeScaleValuesEditor({ scale, isAdmin, nonAdminNotice, onSaved }: Props) {
  const [drafts, setDrafts] = useState<ValueDraft[][]>(() => toValueDrafts(scale.values));
  const [newValue, setNewValue] = useState<string[]>(() => scale.values.map(() => ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<SizeScaleBlocker[]>([]);
  const [warnings, setWarnings] = useState<ScaleValueWarning[]>([]);

  // A different scale selected, or a fresh fetch of this one: drop local edits.
  useEffect(() => {
    setDrafts(toValueDrafts(scale.values));
    setNewValue(scale.values.map(() => ''));
    setBlockers([]);
    setError(null);
  }, [scale]);

  const dirty = useMemo(() => draftsDiffer(scale.values, drafts), [scale.values, drafts]);

  const updateAxis = (axisIndex: number, axis: ValueDraft[]) => {
    if (axis === drafts[axisIndex]) return; // moveEntry's identity contract: an inert click re-renders nothing
    setDrafts(drafts.map((existing, index) => (index === axisIndex ? axis : existing)));
  };

  const add = (axisIndex: number) => {
    const appended = addValueDraft(drafts[axisIndex], newValue[axisIndex]);
    if (appended === null) return;
    updateAxis(axisIndex, appended);
    setNewValue(newValue.map((text, index) => (index === axisIndex ? '' : text)));
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setBlockers([]);
    setWarnings([]);
    try {
      const updated = await replaceSizeScaleValues(scale.id, toValuesPutPayload(drafts));
      setWarnings(updated.warnings ?? []);
      onSaved(updated);
    } catch (err) {
      const parsed = parseSizeScaleError(err);
      setError(parsed.summary);
      setBlockers(parsed.blockers);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setDrafts(toValueDrafts(scale.values));
    setBlockers([]);
    setError(null);
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h5">Ordered values</Typography>
        <Chip size="small" variant="outlined" label={`${scale.usage.variant_count} variant(s) sized on this scale`} />
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error} {blockers.some((blocker) => blocker.reason === 'value_in_use') && DEACTIVATE_INSTEAD_HINT}
        </Alert>
      )}
      {warnings.length > 0 && (
        <Alert severity="warning" onClose={() => setWarnings([])}>
          {warnings.map((warning) => warning.message).join(' ')}
        </Alert>
      )}

      <Grid container spacing={2}>
        {drafts.map((axis, axisIndex) => {
          const addError = newValue[axisIndex].trim() ? validateNewValue(axis, newValue[axisIndex]) : null;
          return (
            <Grid key={axisIndex} size={{ xs: 12, md: scale.axes === 2 ? 6 : 12 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle1">{axisTitle(scale.axis_labels, axisIndex, scale.axes)}</Typography>
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Value</TableCell>
                        <TableCell>Active</TableCell>
                        <TableCell align="right">Order</TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {axis.map((row, rowIndex) => {
                        // Matched by identifier, never by row position — the 409's
                        // detail[] is a subset of what was submitted.
                        const blocker = blockerForValue(blockers, axisIndex, row.value);
                        const warning = warningForValue(warnings, axisIndex, row.value);
                        return (
                          <TableRow key={row.value} hover selected={Boolean(blocker)}>
                            <TableCell>
                              <Stack spacing={0.25}>
                                <Typography variant="body2" sx={{ opacity: row.is_active ? 1 : 0.55 }}>
                                  {row.value}
                                </Typography>
                                {blocker && (
                                  <Typography variant="caption" color="error">
                                    {blocker.message}
                                  </Typography>
                                )}
                                {warning && (
                                  <Typography variant="caption" color="warning.main">
                                    {warning.message}
                                  </Typography>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Tooltip
                                title={
                                  row.is_active
                                    ? 'Deactivate: variants keep this size, but it cannot be assigned to new variants.'
                                    : 'Inactive — kept for history, not assignable.'
                                }
                              >
                                <span>
                                  <Switch
                                    size="small"
                                    checked={row.is_active}
                                    disabled={!isAdmin || busy}
                                    onChange={(event) => updateAxis(axisIndex, setDraftActive(axis, rowIndex, event.target.checked))}
                                  />
                                </span>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                aria-label={`Move ${row.value} up`}
                                disabled={!isAdmin || busy || rowIndex === 0}
                                onClick={() => updateAxis(axisIndex, moveEntry(axis, rowIndex, rowIndex - 1))}
                              >
                                <IconArrowUp size={16} />
                              </IconButton>
                              <IconButton
                                size="small"
                                aria-label={`Move ${row.value} down`}
                                disabled={!isAdmin || busy || rowIndex === axis.length - 1}
                                onClick={() => updateAxis(axisIndex, moveEntry(axis, rowIndex, rowIndex + 1))}
                              >
                                <IconArrowDown size={16} />
                              </IconButton>
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Remove from the scale. Refused if any variant still carries it — deactivate instead.">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    aria-label={`Remove ${row.value}`}
                                    disabled={!isAdmin || busy}
                                    onClick={() => updateAxis(axisIndex, removeDraft(axis, rowIndex))}
                                  >
                                    <IconTrash size={16} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {axis.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography variant="body2" color="text.secondary">
                              No values yet — add the run in order.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <TextField
                    size="small"
                    placeholder="Add a value"
                    value={newValue[axisIndex]}
                    disabled={!isAdmin || busy}
                    error={Boolean(addError)}
                    helperText={addError ?? ' '}
                    onChange={(event) => setNewValue(newValue.map((text, index) => (index === axisIndex ? event.target.value : text)))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        add(axisIndex);
                      }
                    }}
                  />
                  <Button
                    size="small"
                    startIcon={<IconPlus size={14} />}
                    disabled={!isAdmin || busy || !newValue[axisIndex].trim() || Boolean(addError)}
                    onClick={() => add(axisIndex)}
                  >
                    Add
                  </Button>
                </Stack>
              </Stack>
            </Grid>
          );
        })}
      </Grid>

      <Stack direction="row" spacing={1} alignItems="center">
        <Tooltip title={isAdmin ? 'Replaces the whole ordered list — order on screen is the order saved.' : nonAdminNotice}>
          <span>
            <Button variant="contained" disabled={!isAdmin || busy || !dirty} onClick={save}>
              Save values
            </Button>
          </span>
        </Tooltip>
        <Button disabled={busy || !dirty} onClick={reset}>
          Discard changes
        </Button>
        {dirty && (
          <Typography variant="caption" color="text.secondary">
            Unsaved changes — nothing is written until you save.
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
