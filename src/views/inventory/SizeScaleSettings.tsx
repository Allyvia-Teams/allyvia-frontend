// views/inventory/SizeScaleSettings.tsx
//
// The size-scales settings screen (spec Part 3): scale CRUD, ordered-value
// reordering, category bindings with orphan warnings, and the unmatched-sizes
// report with map/add actions. Every rule lives in sizeScales.ts (pure,
// tested); this file and its three panels render them.
//
// NOT NAMED SizeScales.tsx — that would case-collide with sizeScales.ts and
// silently drop this component from the program (the StockCounts hazard).
//
// Reads are open to any role; writes are admin-gated with the Session 7
// notice pattern (backend gate is Role.is_admin == role_type "admin" exactly;
// compared lower-cased because lib/session stores 'Member' capitalised).
//
// NO route or menu wiring here — the parent session wires
// /inventory/size-scales; this file exports the page component only.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import { IconPlus, IconTrash } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';

import { useSelector } from 'store';

import { listProducts } from 'api/inventoryStock.api';
import { deleteSizeScale, listCategoryBindings, listSizeScales, patchSizeScale } from 'api/sizeScales.api';

import SizeScaleBindingsPanel from './SizeScaleBindingsPanel';
import SizeScaleCreateDialog from './SizeScaleCreateDialog';
import SizeScaleUnmatchedPanel from './SizeScaleUnmatchedPanel';
import SizeScaleValuesEditor from './SizeScaleValuesEditor';
import {
  CategoryBindingRow,
  NON_ADMIN_SIZE_SCALES_NOTICE,
  SizeScale,
  SizeScaleBlocker,
  describeDeleteBlocker,
  distinctCategories,
  parseSizeScaleError,
  toPatchPayload
} from './sizeScales';

const KIND_LABELS: Record<string, string> = { alpha: 'Alpha', numeric: 'Numeric', composite: 'Composite' };

interface DeleteState {
  scale: SizeScale;
  blockers: SizeScaleBlocker[] | null; // null before the attempt; [] cannot occur (an empty refusal is a success)
}

export default function SizeScaleSettings() {
  const roleType = useSelector((state) => state.auth.currentRole?.role_type);
  const isAdmin = String(roleType ?? '').toLowerCase() === 'admin';

  const [scales, setScales] = useState<SizeScale[]>([]);
  const [bindings, setBindings] = useState<CategoryBindingRow[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<{ scale: SizeScale; name: string } | null>(null);
  const [deleting, setDeleting] = useState<DeleteState | null>(null);

  const selected = useMemo(() => scales.find((scale) => scale.id === selectedId) ?? null, [scales, selectedId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scaleRows, bindingRows, products] = await Promise.all([listSizeScales(), listCategoryBindings(), listProducts()]);
      setScales(scaleRows);
      setBindings(bindingRows);
      setCategoryOptions(distinctCategories(products));
    } catch (err) {
      setError(parseSizeScaleError(err).summary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** One scale came back from a write: splice it in without a full reload. */
  const absorb = (updated: SizeScale) => {
    setScales((current) => {
      const known = current.some((scale) => scale.id === updated.id);
      const next = known ? current.map((scale) => (scale.id === updated.id ? updated : scale)) : [...current, updated];
      return [...next].sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const toggleActive = async (scale: SizeScale) => {
    setBusy(true);
    setError(null);
    try {
      absorb(await patchSizeScale(scale.id, toPatchPayload({ isActive: !scale.is_active })));
    } catch (err) {
      setError(parseSizeScaleError(err).summary);
    } finally {
      setBusy(false);
    }
  };

  const submitRename = async () => {
    if (!renaming) return;
    setBusy(true);
    setError(null);
    try {
      absorb(await patchSizeScale(renaming.scale.id, toPatchPayload({ name: renaming.name })));
      setRenaming(null);
    } catch (err) {
      setError(parseSizeScaleError(err).summary);
    } finally {
      setBusy(false);
    }
  };

  const submitDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      await deleteSizeScale(deleting.scale.id);
      setDeleting(null);
      if (selectedId === deleting.scale.id) setSelectedId(null);
      await load();
    } catch (err) {
      // The 409 names ALL the protect edges (components / bindings /
      // overrides) at once — keep the dialog open and list every one, so the
      // operator sees the whole job rather than one edge per attempt.
      const parsed = parseSizeScaleError(err);
      if (parsed.blockers.length > 0) {
        setDeleting({ ...deleting, blockers: parsed.blockers });
      } else {
        setError(parsed.summary);
        setDeleting(null);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <MainCard content={false} sx={{ p: 2.5 }}>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h4">Size scales</Typography>
          <Box flexGrow={1} />
          {(loading || busy) && <CircularProgress size={18} />}
          <Tooltip title={isAdmin ? '' : NON_ADMIN_SIZE_SCALES_NOTICE}>
            <span>
              <Button startIcon={<IconPlus size={16} />} variant="contained" disabled={!isAdmin} onClick={() => setCreateOpen(true)}>
                New scale
              </Button>
            </span>
          </Tooltip>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          A scale is a named, ordered size vocabulary — define it once, bind it to a category, and every style in that category sorts and
          validates against it. Styles without a scale keep free-text sizes exactly as before.
        </Typography>

        {!isAdmin && <Alert severity="info">{NON_ADMIN_SIZE_SCALES_NOTICE}</Alert>}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Kind</TableCell>
                <TableCell>Values</TableCell>
                <TableCell>Bound categories</TableCell>
                <TableCell align="right">Variants</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scales.map((scale) => (
                <TableRow
                  key={scale.id}
                  hover
                  selected={scale.id === selectedId}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSelectedId(scale.id === selectedId ? null : scale.id)}
                >
                  <TableCell>
                    <Typography variant="body2">{scale.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={KIND_LABELS[scale.kind] ?? scale.kind} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {scale.values
                        .map((axis, index) => {
                          const active = axis.filter((entry) => entry.is_active).length;
                          const label = scale.axes === 2 ? `${scale.axis_labels[index] || `Axis ${index + 1}`}: ` : '';
                          return `${label}${active}${axis.length !== active ? ` (+${axis.length - active} inactive)` : ''}`;
                        })
                        .join(' · ')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {scale.bound_categories.length > 0 ? (
                      scale.bound_categories.map((category) => <Chip key={category} size="small" label={category} sx={{ mr: 0.5 }} />)
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Not bound
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{scale.usage.variant_count}</TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Tooltip title={isAdmin ? 'Inactive scales keep their data but stop being offered.' : NON_ADMIN_SIZE_SCALES_NOTICE}>
                      <span>
                        <Switch size="small" checked={scale.is_active} disabled={!isAdmin || busy} onChange={() => toggleActive(scale)} />
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" disabled={!isAdmin || busy} onClick={() => setRenaming({ scale, name: scale.name })}>
                        Rename
                      </Button>
                      <Tooltip
                        title={
                          isAdmin ? 'Refused while anything references the scale — the refusal lists what.' : NON_ADMIN_SIZE_SCALES_NOTICE
                        }
                      >
                        <span>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<IconTrash size={14} />}
                            disabled={!isAdmin || busy}
                            onClick={() => setDeleting({ scale, blockers: null })}
                          >
                            Delete
                          </Button>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {scales.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary">
                      No scales yet. Create one, then bind it to a category below.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {selected && (
          <>
            <Divider />
            <SizeScaleValuesEditor
              key={selected.id}
              scale={selected}
              isAdmin={isAdmin}
              nonAdminNotice={NON_ADMIN_SIZE_SCALES_NOTICE}
              onSaved={absorb}
            />
            <Divider />
            <SizeScaleUnmatchedPanel
              key={`unmatched-${selected.id}`}
              scale={selected}
              isAdmin={isAdmin}
              nonAdminNotice={NON_ADMIN_SIZE_SCALES_NOTICE}
              onScaleChanged={(updated) => {
                absorb(updated);
                // Variant re-links change usage counts on OTHER scales too.
                load();
              }}
            />
          </>
        )}

        <Divider />
        <SizeScaleBindingsPanel
          bindings={bindings}
          scales={scales}
          categoryOptions={categoryOptions}
          isAdmin={isAdmin}
          nonAdminNotice={NON_ADMIN_SIZE_SCALES_NOTICE}
          onSaved={(rows) => {
            setBindings(rows);
            // bound_categories / usage on the scales list changed too.
            load();
          }}
        />
      </Stack>

      <SizeScaleCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(scale) => {
          absorb(scale);
          setSelectedId(scale.id);
        }}
      />

      <Dialog open={renaming !== null} onClose={busy ? undefined : () => setRenaming(null)} fullWidth maxWidth="xs">
        <DialogTitle>Rename scale</DialogTitle>
        <DialogContent>
          <TextField
            sx={{ mt: 1 }}
            fullWidth
            label="Name"
            value={renaming?.name ?? ''}
            onChange={(event) => setRenaming(renaming ? { ...renaming, name: event.target.value } : renaming)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenaming(null)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitRename} disabled={busy || !renaming?.name.trim()}>
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleting !== null} onClose={busy ? undefined : () => setDeleting(null)} fullWidth maxWidth="sm">
        <DialogTitle>Delete '{deleting?.scale.name}'?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {deleting?.blockers === null && (
              <Typography variant="body2">
                Deletion is refused while any variant, category binding or style override references the scale — the refusal lists
                everything in the way. Deactivating is the reversible alternative.
              </Typography>
            )}
            {deleting?.blockers && (
              <Alert severity="error">
                <Stack spacing={0.5}>
                  <Typography variant="body2">This scale is still referenced and cannot be deleted:</Typography>
                  {deleting.blockers.map((blocker) => (
                    <Typography key={blocker.reason} variant="caption">
                      • {describeDeleteBlocker(blocker)}
                    </Typography>
                  ))}
                </Stack>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)} disabled={busy}>
            {deleting?.blockers ? 'Close' : 'Cancel'}
          </Button>
          {deleting?.blockers === null && (
            <Button variant="contained" color="error" onClick={submitDelete} disabled={busy || !isAdmin}>
              Delete
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </MainCard>
  );
}
