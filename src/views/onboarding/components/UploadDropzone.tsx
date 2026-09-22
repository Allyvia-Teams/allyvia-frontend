import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

import { alpha, useTheme } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { IconCircleCheck, IconCloudUpload } from '@tabler/icons-react';

import type { UploadItem } from '../hooks/useUploadFlow';
import { formatBytes, isAcceptedFilename, MAX_UPLOAD_BYTES } from '../upload';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

const rejectFile = (message: string) =>
  dispatch(
    openSnackbar({
      open: true,
      message,
      variant: 'alert',
      alert: { color: 'error' },
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      close: true
    })
  );

interface UploadDropzoneProps {
  items: UploadItem[];
  onFiles: (files: File[]) => void;
  onRetry: (itemId: string) => void;
  slowWaitCutoffMs?: number;
  now?: number; // injected tick so waiting rows can flip to the slow note
}

const STATUS_TEXT: Record<UploadItem['status'], string> = {
  queued: 'Queued',
  ticketing: 'Preparing upload…',
  uploading: 'Uploading…',
  waiting_job: 'Waiting for processing…',
  done: 'Queued for ingestion',
  error: 'Upload failed'
};

export default function UploadDropzone({ items, onFiles, onRetry, slowWaitCutoffMs = 60_000, now = Date.now() }: UploadDropzoneProps) {
  const theme = useTheme();

  const onDrop = useCallback(
    (accepted: File[]) => {
      const usable: File[] = [];
      for (const file of accepted) {
        if (!isAcceptedFilename(file.name)) {
          rejectFile(`"${file.name}" is not a supported file type. Upload a CSV, XLSX, or NDJSON file.`);
          continue;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          rejectFile(`"${file.name}" is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`);
          continue;
        }
        usable.push(file);
      }
      if (usable.length > 0) onFiles(usable);
    },
    [onFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/x-ndjson': ['.ndjson', '.jsonl']
    },
    multiple: true
  });

  return (
    <Stack spacing={2}>
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? alpha(theme.palette.primary.main, 0.06) : 'background.paper',
          transition: 'border-color 120ms, background-color 120ms'
        }}
      >
        <input {...getInputProps()} />
        <IconCloudUpload size={40} stroke={1.5} />
        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          {isDragActive ? 'Drop the files here' : 'Drag & drop files here, or click to browse'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          CSV, XLSX, or NDJSON — up to {formatBytes(MAX_UPLOAD_BYTES)} per file
        </Typography>
      </Box>

      {items.length > 0 && (
        <Stack spacing={1.5}>
          {items.map((item) => (
            <Box key={item.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(item.file.size)}
                </Typography>
                {item.status === 'done' && <IconCircleCheck size={18} color={theme.palette.success.main} />}
              </Stack>

              {item.status === 'uploading' && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress variant="determinate" value={item.progressPct} sx={{ height: 8, borderRadius: 1 }} />
                </Box>
              )}
              {(item.status === 'queued' || item.status === 'ticketing' || item.status === 'waiting_job') && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress sx={{ height: 8, borderRadius: 1 }} />
                </Box>
              )}

              {item.status === 'error' ? (
                <Alert
                  severity="error"
                  sx={{ mt: 1 }}
                  action={
                    <Button color="inherit" size="small" onClick={() => onRetry(item.id)}>
                      Retry
                    </Button>
                  }
                >
                  {item.error || 'Upload failed.'}
                </Alert>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {STATUS_TEXT[item.status]}
                  {item.status === 'waiting_job' && item.waitingSince !== undefined && now - item.waitingSince > slowWaitCutoffMs
                    ? ' Still processing — large files can take a couple of minutes.'
                    : ''}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
