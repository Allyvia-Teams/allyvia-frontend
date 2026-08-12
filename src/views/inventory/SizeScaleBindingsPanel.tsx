// views/inventory/SizeScaleBindingsPanel.tsx
//
// Category → scale bindings. The PUT replaces the WHOLE set, so this panel
// edits a draft list and saves it in one write; a row deleted here is a
// binding deleted on the server.
//
// ORPHAN WARNINGS ARE THE POINT OF THIS PANEL, not decoration: a binding is a
// string match against free-text categories (the spec's accepted weak spot),
// so renaming a category silently strands its binding. The server flags
// orphans on GET; this panel shows the flag per row and a summary alert,
// because a binding that does nothing while looking configured is worse than
// no binding.
//
// Client-side validation mirrors the server's 400s (blank category,
// case-insensitive duplicates) via detectBindingProblems — those indices ARE
// meaningful because the client built the list it is validating, unlike a
// 409's detail[].

import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Stack,
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
import { IconPlus, IconTrash } from '@tabler/icons-react';

import { replaceCategoryBindings } from 'api/sizeScales.api';

import {
  BindingDraft,
  CategoryBindingRow,
  ORPHANED_BINDING_NOTICE,
  SizeScale,
  detectBindingProblems,
  parseSizeScaleError,
  toBindingDrafts,
  toBindingsPutPayload
} from './sizeScales';

interface Props {
  bindings: CategoryBindingRow[];
  scales: SizeScale[];
  /** Category suggestions from live products; free text stays allowed. */
  categoryOptions: string[];
  isAdmin: boolean;
  nonAdminNotice: string;
  onSaved: (rows: CategoryBindingRow[]) => void;
}

export default function SizeScaleBindingsPanel({ bindings, scales, categoryOptions, isAdmin, nonAdminNotice, onSaved }: Props) {
  const [drafts, setDrafts] = useState<BindingDraft[] | null>(null); // null = not editing; view mode shows the server rows
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const editing = drafts !== null;
  const problems = useMemo(() => detectBindingProblems(drafts ?? []), [drafts]);
  const orphanCount = bindings.filter((row) => row.orphaned).length;

  const startEditing = () => {
    setDrafts(toBindingDrafts(bindings));
    setTouched(false);
    setError(null);
  };

  const cancel = () => {
    setDrafts(null);
    setError(null);
  };

  const updateDraft = (index: number, patch: Partial<BindingDraft>) => {
    if (!drafts) return;
    setDrafts(drafts.map((draft, position) => (position === index ? { ...draft, ...patch } : draft)));
  };

  const save = async () => {
    if (!drafts) return;
    setTouched(true);
    if (!problems.valid) return;
    setBusy(true);
    setError(null);
    try {
      const rows = await replaceCategoryBindings(toBindingsPutPayload(drafts));
      onSaved(rows);
      setDrafts(null);
    } catch (err) {
      setError(parseSizeScaleError(err).summary);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h5">Category bindings</Typography>
        {orphanCount > 0 && <Chip size="small" color="warning" label={`${orphanCount} orphaned`} />}
        <Typography variant="caption" color="text.secondary">
          A style without an override uses its category's scale. Matching is case-insensitive.
        </Typography>
      </Stack>

      {orphanCount > 0 && !editing && <Alert severity="warning">{ORPHANED_BINDING_NOTICE}</Alert>}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell>Scale</TableCell>
              <TableCell>Status</TableCell>
              {editing && <TableCell align="right" />}
            </TableRow>
          </TableHead>
          <TableBody>
            {!editing &&
              bindings.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.scale_name}</TableCell>
                  <TableCell>
                    {row.orphaned ? (
                      <Tooltip title={ORPHANED_BINDING_NOTICE}>
                        <Chip size="small" color="warning" variant="outlined" label="Orphaned — no style has this category" />
                      </Tooltip>
                    ) : (
                      <Chip size="small" color="success" variant="outlined" label="In use" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            {editing &&
              (drafts ?? []).map((draft, index) => {
                const problem = touched ? problems.byIndex.get(index) : undefined;
                return (
                  <TableRow key={index} hover>
                    <TableCell sx={{ minWidth: 220 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={categoryOptions}
                        inputValue={draft.category}
                        onInputChange={(_event, value) => updateDraft(index, { category: value })}
                        disabled={busy}
                        renderInput={(params) => (
                          <TextField {...params} placeholder="Category" error={Boolean(problem)} helperText={problem ?? ''} />
                        )}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={draft.scaleId}
                        disabled={busy}
                        onChange={(event) => updateDraft(index, { scaleId: event.target.value })}
                      >
                        {scales.map((scale) => (
                          <MenuItem key={scale.id} value={scale.id}>
                            {scale.name}
                            {!scale.is_active && ' (inactive)'}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell />
                    <TableCell align="right">
                      <Tooltip title="Remove this binding — saving deletes it on the server.">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Remove binding ${draft.category || index + 1}`}
                            disabled={busy}
                            onClick={() => setDrafts((drafts ?? []).filter((_row, position) => position !== index))}
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            {(editing ? (drafts ?? []).length : bindings.length) === 0 && (
              <TableRow>
                <TableCell colSpan={editing ? 4 : 3}>
                  <Typography variant="body2" color="text.secondary">
                    No bindings yet. Without one, styles keep free-text sizes exactly as today.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {editing ? (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<IconPlus size={14} />}
            disabled={busy || scales.length === 0}
            onClick={() => setDrafts([...(drafts ?? []), { category: '', scaleId: scales[0]?.id ?? '' }])}
          >
            Add binding
          </Button>
          <Button variant="contained" size="small" disabled={busy || (touched && !problems.valid)} onClick={save}>
            Save bindings
          </Button>
          <Button size="small" disabled={busy} onClick={cancel}>
            Cancel
          </Button>
        </Stack>
      ) : (
        <Stack direction="row" spacing={1}>
          <Tooltip title={isAdmin ? 'Edit the whole set; saving replaces it in one write.' : nonAdminNotice}>
            <span>
              <Button size="small" variant="outlined" disabled={!isAdmin || scales.length === 0} onClick={startEditing}>
                Edit bindings
              </Button>
            </span>
          </Tooltip>
        </Stack>
      )}
    </Stack>
  );
}
