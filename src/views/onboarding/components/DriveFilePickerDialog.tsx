// Drive spreadsheet picker: search + mime-filtered listing (server-side via
// GET /onboarding/drive/files/), token pagination via "Load more", pick →
// POST /sources/ {kind: google_drive, file_id, ...} (useImportDriveFile snacks
// and invalidates the state cache; the dialog closes on success).

import { useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { DriveFile } from 'api/onboarding.api';
import { useDriveFiles, useImportDriveFile } from '../hooks/useOnboardingQueries';

const SEARCH_DEBOUNCE_MS = 300;

const MIME_LABELS: Record<string, string> = {
  'application/vnd.google-apps.spreadsheet': 'Google Sheet',
  'text/csv': 'CSV',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel'
};

const formatBytes = (size: number): string => {
  if (size >= 1_048_576) return `${(size / 1_048_576).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
};

const fileSecondary = (file: DriveFile): string => {
  const parts = [MIME_LABELS[file.mime_type] ?? file.mime_type];
  if (file.modified_at) {
    const modified = new Date(file.modified_at);
    if (!Number.isNaN(modified.getTime())) parts.push(`Modified ${modified.toLocaleDateString()}`);
  }
  const size = Number(file.size ?? 0);
  if (size > 0) parts.push(formatBytes(size));
  return parts.join(' · ');
};

interface DriveFilePickerDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function DriveFilePickerDialog({ open, onClose }: DriveFilePickerDialogProps) {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [pageToken, setPageToken] = useState('');
  // "Load more" appends pages; a new query resets the accumulation.
  const [collected, setCollected] = useState<DriveFile[]>([]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setQ(search);
      setPageToken('');
      setCollected([]);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  // Fresh listing every open — a stale accumulation would hide new files.
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setQ('');
    setPageToken('');
    setCollected([]);
  }, [open]);

  const files = useDriveFiles(open, q, pageToken);
  const importFile = useImportDriveFile();

  const data = files.data;
  useEffect(() => {
    if (!data) return;
    setCollected((prev) => {
      const seen = new Set(prev.map((f) => f.id));
      const appended = data.files.filter((f) => !seen.has(f.id));
      return appended.length === 0 ? prev : [...prev, ...appended];
    });
  }, [data]);

  const errorStatus = (files.error as any)?.response?.status;
  const disconnected = errorStatus === 409;

  const pick = (file: DriveFile) => {
    importFile.mutate(file, { onSuccess: () => onClose() });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Import from Google Drive</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your spreadsheets…"
            size="small"
            fullWidth
            autoFocus
          />
          {files.isError ? (
            <Alert
              severity={disconnected ? 'warning' : 'error'}
              action={
                !disconnected && (
                  <Button color="inherit" size="small" onClick={() => files.refetch()}>
                    Retry
                  </Button>
                )
              }
            >
              {disconnected
                ? 'Google Drive is not connected. Connect it first, then try again.'
                : "Couldn't list your Drive files. Try again in a moment."}
            </Alert>
          ) : collected.length === 0 && (files.isLoading || files.isFetching) ? (
            <Stack alignItems="center" sx={{ py: 3 }}>
              <CircularProgress size={24} />
            </Stack>
          ) : collected.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No spreadsheets found{q ? ` for “${q}”` : ''}.
            </Typography>
          ) : (
            <List dense disablePadding>
              {collected.map((file) => (
                <ListItemButton key={file.id} onClick={() => pick(file)} disabled={importFile.isPending}>
                  <ListItemText primary={file.name} secondary={fileSecondary(file)} />
                </ListItemButton>
              ))}
            </List>
          )}
          {!files.isError && data?.next_page_token && (
            <Button size="small" onClick={() => setPageToken(data.next_page_token)} disabled={files.isFetching}>
              Load more
            </Button>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {importFile.isPending && <CircularProgress size={16} sx={{ mr: 1 }} />}
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
