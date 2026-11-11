// The header's one sync indicator, for every integration's FIRST import. A
// chip while a first import runs, waits for review or has failed, nothing at
// all otherwise;
// routine background syncing never shows. Clicking it lists those imports and
// their datasets.

import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/material/styles';
import { IconAlertTriangle, IconCheck, IconClipboardCheck, IconRefresh } from '@tabler/icons-react';

import { useGlobalSync } from 'hooks/useGlobalSync';
import type { IntegrationSync, SyncDataset } from 'views/pos-integrations/globalSync';
import { chipView, datasetPercent, datasetText, progressRows, retryLabel, REVIEW_TEXT } from 'views/pos-integrations/globalSync';

const POPOVER_ID = 'global-sync-status';

// The chip's color and icon: running, waiting for the merchant, failed.
const CHIP_STYLE = {
  importing: { color: 'primary', icon: <IconRefresh size={18} aria-hidden /> },
  review: { color: 'warning', icon: <IconClipboardCheck size={18} aria-hidden /> },
  failed: { color: 'error', icon: <IconAlertTriangle size={18} aria-hidden /> }
} as const;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

function DatasetRow({ dataset }: { dataset: SyncDataset }) {
  const percent = dataset.done ? null : datasetPercent(dataset);
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="body2">{dataset.label}</Typography>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary', flexShrink: 0 }}>
          {dataset.done && <IconCheck size={16} aria-label="Done" color="currentColor" style={{ flexShrink: 0 }} />}
          <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {datasetText(dataset)}
          </Typography>
        </Stack>
      </Stack>
      {percent !== null && (
        <LinearProgress
          variant="determinate"
          value={percent}
          aria-label={`${dataset.label} ${datasetText(dataset)}`}
          sx={{ mt: 0.5, height: 3, borderRadius: 2 }}
        />
      )}
    </Box>
  );
}

export function IntegrationRow({
  item,
  onRetry,
  retrying,
  onNavigate
}: {
  item: IntegrationSync;
  onRetry: (item: IntegrationSync) => void;
  retrying: boolean;
  onNavigate: () => void;
}) {
  const rows = progressRows(item);
  return (
    <Stack spacing={1} sx={{ px: 2, py: 1.5 }}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
        <Link component={RouterLink} to={item.path} onClick={onNavigate} underline="hover" color="text.primary" variant="subtitle1">
          {item.label}
        </Link>
        {item.state === 'importing' && (
          <Typography variant="caption" color="primary">
            Importing
          </Typography>
        )}
      </Stack>

      {item.state === 'importing' &&
        (rows.length ? (
          rows.map((dataset) => <DatasetRow key={dataset.label} dataset={dataset} />)
        ) : (
          <Typography variant="body2" color="text.secondary">
            This can take a few minutes.
          </Typography>
        ))}

      {item.state === 'review' && (
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {REVIEW_TEXT}
          </Typography>
          {item.retry?.kind === 'open' && (
            <Button
              component={RouterLink}
              to={item.retry.path}
              onClick={onNavigate}
              size="small"
              variant="outlined"
              color="warning"
              sx={{ flexShrink: 0 }}
            >
              Open
            </Button>
          )}
        </Stack>
      )}

      {item.state === 'failed' && (
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Typography variant="body2" color="error">
            {item.error}
          </Typography>
          {item.retry && (
            <Button size="small" variant="outlined" color="error" disabled={retrying} onClick={() => onRetry(item)} sx={{ flexShrink: 0 }}>
              {retryLabel(item.retry)}
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  );
}

export default function GlobalSyncIndicator() {
  const { items, retry, retrying } = useGlobalSync();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const chip = chipView(items);

  // The chip goes once no first import is running or failed; close the list
  // with it, or it would spring open by itself the next time one starts.
  useEffect(() => {
    if (!chip) setAnchorEl(null);
  }, [chip]);

  if (!chip) return null;

  const open = Boolean(anchorEl);
  const close = () => setAnchorEl(null);
  const importing = chip.kind === 'importing';

  return (
    <>
      <Chip
        clickable
        onClick={(event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? POPOVER_ID : undefined}
        color={CHIP_STYLE[chip.kind].color}
        icon={CHIP_STYLE[chip.kind].icon}
        label={chip.label}
        sx={{
          height: 32,
          fontSize: '0.875rem',
          flexShrink: 0,
          '& .MuiChip-icon': {
            color: 'inherit',
            ...(importing && {
              animation: `${spin} 1s linear infinite`,
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
            })
          }
        }}
      />
      <Popover
        id={POPOVER_ID}
        open={open}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, width: 340, maxWidth: 'calc(100vw - 32px)', maxHeight: '70vh' } } }}
      >
        <Box role="dialog" aria-label="Sync status">
          <Typography variant="h5" sx={{ px: 2, pt: 1.5, pb: 1 }}>
            Sync status
          </Typography>
          <Divider />
          {items.map((item, index) => (
            <Box key={item.key}>
              {index > 0 && <Divider />}
              <IntegrationRow item={item} onRetry={retry} retrying={retrying === item.key} onNavigate={close} />
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
}
