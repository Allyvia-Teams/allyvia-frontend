// "Drop your line sheet here" (design §10, the empty state): a spreadsheet, a vendor PDF with pictures, or
// photos. No `accept` filter: the page sniffs each file by its bytes, previews a CSV, and the server decides.
// The hidden input stays in the DOM (the browser walk drops files through it).

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { previewCsv, sniff, validateDrop, type CsvPreview, type FileKind } from '../intake';

const KIND_WORDS: Record<FileKind, string> = {
  pdf: 'PDF',
  image: 'Photo',
  spreadsheet: 'Workbook',
  csv: 'Spreadsheet (CSV)',
  unknown: 'Not a file the planner reads'
};

interface Picked {
  file: File;
  kind: FileKind;
  preview: CsvPreview | null;
}

interface Props {
  uploading: boolean;
  progress: number | null;
  compact?: boolean;
  onSubmit: (files: File[]) => void;
}

const readHead = async (file: File): Promise<Uint8Array> => new Uint8Array(await file.slice(0, 64).arrayBuffer());

export default function PlanDropZone({ uploading, progress, compact = false, onSubmit }: Props) {
  const [picked, setPicked] = useState<Picked[]>([]);
  const add = async (files: File[]) => {
    const read = await Promise.all(
      files.map(async (file) => {
        const kind = sniff(await readHead(file), file.name);
        const preview = kind === 'csv' && file.size <= 2 * 1024 * 1024 ? previewCsv(await file.text()) : null;
        return { file, kind, preview };
      })
    );
    setPicked((current) => [...current, ...read]);
  };
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: true,
    noClick: true,
    disabled: uploading,
    onDrop: (accepted) => void add(accepted)
  });
  const check = validateDrop(picked.map((p) => ({ name: p.file.name, size: p.file.size })));

  return (
    <Stack spacing={1.5}>
      <Box
        {...getRootProps()}
        sx={(theme) => ({
          border: '1.5px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          borderRadius: '12px',
          p: compact ? 2.5 : 5,
          textAlign: 'center',
          bgcolor: isDragActive ? alpha(theme.palette.primary.main, 0.05) : 'transparent'
        })}
      >
        <input {...getInputProps()} data-testid="plan-drop-input" />
        <Typography component="h2" sx={{ fontSize: compact ? '1rem' : '1.25rem', fontWeight: 600 }}>
          Drop your line sheet here
        </Typography>
        {!compact ? (
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 520, mx: 'auto' }}>
            A spreadsheet, a vendor PDF with pictures, or photos of the pieces. We read every item, match it against what has sold here and
            who shops with you, and size it for your order date.
          </Typography>
        ) : null}
        <Button variant="outlined" sx={{ mt: 2 }} onClick={open} disabled={uploading}>
          Choose files
        </Button>
      </Box>

      {picked.length ? (
        <Stack spacing={0.75}>
          {picked.map((p, i) => (
            <Box key={`${p.file.name}-${i}`} sx={{ display: 'flex', gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 500 }}>{p.file.name}</Typography>
              <Typography variant="caption" color={p.kind === 'unknown' ? 'warning.main' : 'text.secondary'}>
                {KIND_WORDS[p.kind]}
                {p.preview
                  ? ` · ${p.preview.rows} rows, ${p.preview.styles} styles${p.preview.noPrice ? `, ${p.preview.noPrice} rows without a retail price` : ''}`
                  : ''}
              </Typography>
              <Button
                size="small"
                variant="text"
                color="inherit"
                onClick={() => setPicked((current) => current.filter((_, j) => j !== i))}
                disabled={uploading}
                sx={{ ml: 'auto' }}
              >
                Remove
              </Button>
            </Box>
          ))}
          {!check.ok ? (
            <Alert severity="warning">
              {check.sentences.map((s) => (
                <div key={s}>{s}</div>
              ))}
            </Alert>
          ) : null}
          {uploading ? <LinearProgress variant={progress === null ? 'indeterminate' : 'determinate'} value={progress ?? 0} /> : null}
          <Box>
            <Button
              variant="contained"
              disabled={!check.ok || uploading}
              onClick={() => {
                onSubmit(picked.map((p) => p.file));
                setPicked([]);
              }}
            >
              Read {picked.length === 1 ? 'this file' : `these ${picked.length} files`}
            </Button>
          </Box>
        </Stack>
      ) : null}
    </Stack>
  );
}
