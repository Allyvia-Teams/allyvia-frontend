// Drop any number of spreadsheets or zips; nothing is asked until they are read.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { listLocations } from 'api/inventoryStock.api';

import { formatDropSize } from './importDrop';

export const DROP_ACCEPT = {
  'text/csv': ['.csv'],
  'text/tab-separated-values': ['.tsv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip']
};

interface Props {
  uploading: boolean;
  progress: number | null;
  onSubmit: (files: File[], options: { defaultLocationId?: string; timezone?: string }) => void;
}

export default function DropZone({ uploading, progress, onSubmit }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [storeId, setStoreId] = useState('');
  const [timezone, setTimezone] = useState('');
  const stores = useQuery({ queryKey: ['inventory-locations'], queryFn: listLocations });
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: DROP_ACCEPT,
    multiple: true,
    disabled: uploading,
    onDrop: (accepted) => setFiles((current) => [...current, ...accepted])
  });
  const activeStores = (stores.data ?? []).filter((store) => store.is_active);

  return (
    <Stack spacing={2}>
      <Box
        {...getRootProps()}
        sx={{
          border: '1px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: uploading ? 'default' : 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'transparent'
        }}
      >
        <input {...getInputProps()} />
        <Typography variant="subtitle1">Drop every export you have — spreadsheets or zips, as many as you like</Typography>
        <Typography variant="body2" color="text.secondary">
          Customers, products, stock, sales, vendors, expenses. We read each file and say where it goes before anything imports.
        </Typography>
      </Box>

      {files.length ? (
        <Typography variant="body2">
          {files.length} {files.length === 1 ? 'file' : 'files'} ready ({formatDropSize(files.reduce((sum, file) => sum + file.size, 0))}):{' '}
          {files.map((file) => file.name).join(', ')}
        </Typography>
      ) : null}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          select
          size="small"
          label="Rows that name no store belong to"
          value={storeId}
          onChange={(event) => setStoreId(event.target.value)}
          sx={{ minWidth: 280 }}
          helperText="Optional. A store name that matches none of yours is held, never guessed."
        >
          <MenuItem value="">Decide per file</MenuItem>
          {activeStores.map((store) => (
            <MenuItem key={store.id} value={store.id}>
              {store.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Time zone the times are in"
          placeholder="e.g. America/Indiana/Indianapolis"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          sx={{ minWidth: 280 }}
          helperText="Optional. Otherwise each store's own zone is used."
        />
      </Stack>

      {uploading ? <LinearProgress variant={progress == null ? 'indeterminate' : 'determinate'} value={progress ?? 0} /> : null}

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={!files.length || uploading}
          onClick={() => onSubmit(files, { defaultLocationId: storeId || undefined, timezone: timezone.trim() || undefined })}
        >
          Read these files
        </Button>
        <Button disabled={!files.length || uploading} onClick={() => setFiles([])}>
          Clear
        </Button>
      </Stack>
    </Stack>
  );
}
