// A run that stopped moving, with the way out (cancel it) on the drop page.

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';

import type { BulkDrop } from 'api/importDrops.api';

import { stalledNotice } from './importDrop';

interface Props {
  drop: BulkDrop;
  busy?: boolean;
  onCancel?: (runId: string) => void;
}

export default function StalledRunAlert({ drop, busy, onCancel }: Props) {
  const notice = stalledNotice(drop);
  if (!notice) return null;
  return (
    <Alert
      severity="warning"
      action={
        notice.canCancel && onCancel ? (
          <Button color="inherit" size="small" disabled={busy} onClick={() => onCancel(notice.runId)}>
            Cancel this import
          </Button>
        ) : undefined
      }
    >
      <AlertTitle>{notice.title}</AlertTitle>
      {notice.body}
    </Alert>
  );
}
