// Upload up to four files, one per kind of data.
//
// All four are optional and independent: plenty of merchants only have a
// customer list, and a wizard that insists on a full set would turn them away
// at the door. Order is the only thing that matters and it is handled for them.

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import type { CsvEntity, UploadedFile } from 'api/posIntegrations.api';
import { CSV_ENTITIES, ENTITY_LABELS } from 'api/posIntegrations.api';

const DESCRIPTIONS: Record<CsvEntity, string> = {
  customer: 'Names, emails, phone numbers, addresses.',
  product: 'Your catalogue — one row per item or size/colour.',
  inventory_level: 'How much stock you hold, per location.',
  order: 'Past sales. One row per line, repeating the order number.'
};

const ACCEPT = {
  'text/csv': ['.csv'],
  'text/tab-separated-values': ['.tsv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xlsm']
};

interface DropSlotProps {
  entity: CsvEntity;
  existing?: UploadedFile;
  pending?: File;
  disabled?: boolean;
  onFile: (entity: CsvEntity, file: File) => void;
}

function DropSlot({ entity, existing, pending, disabled, onFile }: DropSlotProps) {
  const theme = useTheme();
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(entity, accepted[0]);
    },
    [entity, onFile]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: false,
    disabled
  });

  const chosen = pending?.name ?? existing?.filename ?? null;

  return (
    <Card
      variant="outlined"
      {...getRootProps()}
      sx={{
        cursor: disabled ? 'default' : 'pointer',
        height: '100%',
        borderStyle: 'dashed',
        borderColor: isDragActive ? 'primary.main' : chosen ? 'success.main' : 'divider',
        bgcolor: isDragActive ? theme.palette.action.hover : 'transparent',
        transition: 'border-color .15s, background-color .15s'
      }}
    >
      <input {...getInputProps()} />
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            {chosen ? <CheckCircleIcon fontSize="small" color="success" /> : <UploadFileIcon fontSize="small" color="disabled" />}
            <Typography variant="subtitle1">{ENTITY_LABELS[entity]}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {DESCRIPTIONS[entity]}
          </Typography>
          <Typography variant="body2" color={chosen ? 'success.main' : 'text.secondary'} noWrap>
            {chosen ?? 'Drop a file, or click to choose'}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

interface Props {
  existing: Partial<Record<CsvEntity, UploadedFile>>;
  pending: Partial<Record<CsvEntity, File>>;
  uploading?: boolean;
  onFile: (entity: CsvEntity, file: File) => void;
  onUpload: () => void;
}

export default function FileUploadStep({ existing, pending, uploading, onFile, onUpload }: Props) {
  const hasPending = Object.keys(pending).length > 0;
  // Files uploaded on an earlier visit still count. Requiring a fresh upload to
  // move on would strand anyone who came back to finish a wizard they left.
  const hasExisting = Object.keys(existing).length > 0;

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Export what you have from your old system and drop the files here. CSV, TSV and Excel all work, in any column order — you’ll get to
        check how we read them before anything is imported. Every file is optional.
      </Typography>

      <Grid container spacing={2}>
        {CSV_ENTITIES.map((entity) => (
          <Grid key={entity} size={{ xs: 12, sm: 6 }}>
            <DropSlot entity={entity} existing={existing[entity]} pending={pending[entity]} disabled={uploading} onFile={onFile} />
          </Grid>
        ))}
      </Grid>

      <Box>
        <Button variant="contained" disabled={(!hasPending && !hasExisting) || uploading} onClick={onUpload}>
          {uploading ? 'Uploading…' : hasPending ? 'Upload and continue' : 'Continue'}
        </Button>
      </Box>
    </Stack>
  );
}
