import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { IconDotsVertical, IconEye, IconEyeOff, IconGripVertical, IconPlus } from '@tabler/icons-react';
import type { CreatePagePayload, StorefrontPage, UpdatePagePayload } from 'types/storefront';

export function slugifyHandle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export type PageManagerDialogProps = {
  open: boolean;
  pages: StorefrontPage[];
  onClose: () => void;
  onCreatePage: (payload: CreatePagePayload) => Promise<void>;
  onUpdatePage: (pageId: string, payload: UpdatePagePayload) => Promise<void>;
  onDeletePage: (pageId: string) => Promise<void>;
  onReorderPages: (orderedIds: string[]) => Promise<void>;
  onSelectPage?: (pageId: string) => void;
};

const PageManagerDialog: React.FC<PageManagerDialogProps> = ({
  open,
  pages,
  onClose,
  onCreatePage,
  onUpdatePage,
  onDeletePage,
  onReorderPages,
  onSelectPage
}) => {
  const orderedPages = useMemo(() => [...pages].sort((a, b) => a.sort - b.sort), [pages]);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuPageId, setMenuPageId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newKind, setNewKind] = useState<'standard' | 'policy'>('standard');
  const [newTitle, setNewTitle] = useState('');
  const [newHandle, setNewHandle] = useState('');
  const [handleTouched, setHandleTouched] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [renamePageId, setRenamePageId] = useState<string | null>(null);

  const [handleConfirmOpen, setHandleConfirmOpen] = useState(false);
  const [pendingHandlePageId, setPendingHandlePageId] = useState<string | null>(null);
  const [pendingHandle, setPendingHandle] = useState('');
  const [handleEditOpen, setHandleEditOpen] = useState(false);
  const [handleDraft, setHandleDraft] = useState('');

  const menuPage = orderedPages.find((page) => page.id === menuPageId) ?? null;

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuPageId(null);
  };

  const resetCreateForm = () => {
    setCreating(false);
    setNewKind('standard');
    setNewTitle('');
    setNewHandle('');
    setHandleTouched(false);
  };

  const handleDragStart = (pageId: string) => (event: React.DragEvent) => {
    setDraggedId(pageId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', pageId);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetId: string) => async (event: React.DragEvent) => {
    event.preventDefault();
    const sourceId = draggedId || event.dataTransfer.getData('text/plain');
    setDraggedId(null);
    if (!sourceId || sourceId === targetId) return;

    const ids = orderedPages.map((page) => page.id);
    const fromIndex = ids.indexOf(sourceId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...ids];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    setBusy(true);
    setError(null);
    try {
      await onReorderPages(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reorder pages');
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    const title = newTitle.trim();
    const handle = (handleTouched ? newHandle : slugifyHandle(title)).trim();
    if (!title || !handle) {
      setError('Title and handle are required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreatePage({
        kind: newKind,
        title,
        handle,
        is_visible: true,
        sort: orderedPages.length
      });
      resetCreateForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create page');
    } finally {
      setBusy(false);
    }
  };

  const openRename = (page: StorefrontPage) => {
    setRenamePageId(page.id);
    setRenameTitle(page.title);
    setRenameOpen(true);
    closeMenu();
  };

  const submitRename = async () => {
    if (!renamePageId || !renameTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onUpdatePage(renamePageId, { title: renameTitle.trim() });
      setRenameOpen(false);
      setRenamePageId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename page');
    } finally {
      setBusy(false);
    }
  };

  const openHandleEdit = (page: StorefrontPage) => {
    setPendingHandlePageId(page.id);
    setHandleDraft(page.handle);
    setHandleEditOpen(true);
    closeMenu();
  };

  const requestHandleChange = () => {
    if (!pendingHandlePageId) return;
    const next = handleDraft.trim();
    const current = orderedPages.find((p) => p.id === pendingHandlePageId)?.handle;
    if (!next || next === current) {
      setHandleEditOpen(false);
      return;
    }
    setPendingHandle(next);
    setHandleEditOpen(false);
    setHandleConfirmOpen(true);
  };

  const confirmHandleChange = async () => {
    if (!pendingHandlePageId || !pendingHandle) return;
    setBusy(true);
    setError(null);
    try {
      await onUpdatePage(pendingHandlePageId, { handle: pendingHandle });
      setHandleConfirmOpen(false);
      setPendingHandlePageId(null);
      setPendingHandle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change handle');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (page: StorefrontPage) => {
    if (page.kind === 'home') return;
    closeMenu();
    setBusy(true);
    setError(null);
    try {
      await onDeletePage(page.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete page');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleVisible = async (page: StorefrontPage) => {
    setBusy(true);
    setError(null);
    try {
      await onUpdatePage(page.id, { is_visible: !page.is_visible });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update visibility');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
        <DialogTitle>Manage pages</DialogTitle>
        <DialogContent dividers>
          {error ? (
            <Typography color="error" variant="body2" sx={{ mb: 1.5 }}>
              {error}
            </Typography>
          ) : null}

          <List dense disablePadding>
            {orderedPages.map((page) => (
              <ListItem
                key={page.id}
                draggable={!busy}
                onDragStart={handleDragStart(page.id)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(page.id)}
                onDragEnd={() => setDraggedId(null)}
                secondaryAction={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <Tooltip title={page.is_visible ? 'Hide from storefront' : 'Show on storefront'}>
                      <IconButton
                        size="small"
                        disabled={busy}
                        onClick={() => void handleToggleVisible(page)}
                        aria-label="Toggle visibility"
                      >
                        {page.is_visible ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      disabled={busy}
                      aria-label="Page actions"
                      onClick={(event) => {
                        setMenuAnchor(event.currentTarget);
                        setMenuPageId(page.id);
                      }}
                    >
                      <IconDotsVertical size={16} />
                    </IconButton>
                  </Box>
                }
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 0.75,
                  opacity: draggedId === page.id ? 0.6 : 1,
                  pr: 10,
                  cursor: onSelectPage ? 'pointer' : 'default'
                }}
                onClick={() => onSelectPage?.(page.id)}
              >
                <ListItemIcon sx={{ minWidth: 28, cursor: 'grab' }}>
                  <IconGripVertical size={16} />
                </ListItemIcon>
                <ListItemText
                  primary={page.title}
                  secondary={`/${page.handle === 'home' ? '' : page.handle} · ${page.kind}`}
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                />
              </ListItem>
            ))}
          </List>

          {creating ? (
            <Stack spacing={1.5} sx={{ mt: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="subtitle2">New page</Typography>
              <FormControl size="small" fullWidth>
                <InputLabel id="new-page-kind-label">Kind</InputLabel>
                <Select
                  labelId="new-page-kind-label"
                  label="Kind"
                  value={newKind}
                  onChange={(event) => setNewKind(event.target.value as 'standard' | 'policy')}
                >
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="policy">Policy</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="Title"
                value={newTitle}
                onChange={(event) => {
                  const title = event.target.value;
                  setNewTitle(title);
                  if (!handleTouched) setNewHandle(slugifyHandle(title));
                }}
                fullWidth
              />
              <TextField
                size="small"
                label="Handle (URL)"
                value={newHandle}
                onChange={(event) => {
                  setHandleTouched(true);
                  setNewHandle(slugifyHandle(event.target.value));
                }}
                helperText={`URL path: /${newHandle || '…'}`}
                fullWidth
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={resetCreateForm} disabled={busy}>
                  Cancel
                </Button>
                <Button size="small" variant="contained" onClick={() => void handleCreate()} disabled={busy || !newTitle.trim()}>
                  Create
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Button startIcon={<IconPlus size={16} />} onClick={() => setCreating(true)} sx={{ mt: 1.5 }} disabled={busy}>
              New page
            </Button>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            if (menuPage) openRename(menuPage);
          }}
        >
          Rename
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuPage) openHandleEdit(menuPage);
          }}
        >
          Change handle
        </MenuItem>
        {menuPage?.kind === 'home' ? (
          <Tooltip title="Home page cannot be deleted" placement="left">
            <span>
              <MenuItem disabled>Delete</MenuItem>
            </span>
          </Tooltip>
        ) : (
          <MenuItem
            onClick={() => {
              if (menuPage) void handleDelete(menuPage);
            }}
          >
            Delete
          </MenuItem>
        )}
      </Menu>

      <Dialog open={renameOpen} onClose={() => !busy && setRenameOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Rename page</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void submitRename()} disabled={busy || !renameTitle.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={handleEditOpen} onClose={() => !busy && setHandleEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Change handle</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Handle"
            fullWidth
            value={handleDraft}
            onChange={(event) => setHandleDraft(slugifyHandle(event.target.value))}
            helperText={`URL path: /${handleDraft || '…'}`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHandleEditOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={requestHandleChange} disabled={busy || !handleDraft.trim()}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={handleConfirmOpen} onClose={() => !busy && setHandleConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Change URL?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Changing the URL means existing links to this page will break. Continue?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setHandleConfirmOpen(false);
              setPendingHandlePageId(null);
              setPendingHandle('');
            }}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button color="warning" variant="contained" onClick={() => void confirmHandleChange()} disabled={busy}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PageManagerDialog;
