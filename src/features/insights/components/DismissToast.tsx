import { useRef } from 'react';

import { Box, Button, Chip, Snackbar, SnackbarContent, Stack, Typography } from '@mui/material';

import { DISMISS_REASONS, type DismissReason, type PendingDismissal } from '../dismissals';
import { shortTitle } from '../insightsView';

/** How long the toast waits before the dismissal is sent. MUI pauses it while the pointer or focus is on the toast. */
export const UNDO_TOAST_MS = 6000;

interface DismissToastProps {
  pending: PendingDismissal | null;
  onUndo: () => void;
  onReason: (reason: DismissReason | null) => void;
  /** The toast timed out or was closed with Escape: make the dismissal final. */
  onCommit: (id: string) => void;
  /** Where focus goes when the toast closes while it holds focus. */
  returnFocus: () => void;
}

/**
 * "Dismissed <title>" with Undo and three optional reason chips. One toast per
 * pending dismissal: the key remounts it, so a second dismiss restarts the
 * timer. A click elsewhere on the page does not close it.
 */
export default function DismissToast({ pending, onUndo, onReason, onCommit, returnFocus }: DismissToastProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  if (!pending) return null;

  // The toast unmounts as soon as it closes; if it held focus, put focus back
  // on the list instead of dropping it to <body>.
  const thenReturnFocus = (close: () => void) => {
    const hadFocus = typeof document !== 'undefined' && Boolean(rootRef.current?.contains(document.activeElement));
    close();
    if (hadFocus) returnFocus();
  };

  return (
    <Snackbar
      key={pending.id}
      ref={rootRef}
      open
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      autoHideDuration={UNDO_TOAST_MS}
      onClose={(_event, reason) => {
        if (reason === 'clickaway') return;
        thenReturnFocus(() => onCommit(pending.id));
      }}
      data-dismiss-toast={pending.id}
    >
      <SnackbarContent
        sx={{ alignItems: 'flex-start', maxWidth: 560 }}
        message={
          <Box>
            <Typography component="p" sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'inherit' }}>
              Dismissed {shortTitle(pending.title)}
            </Typography>
            <Stack
              direction="row"
              role="group"
              aria-label="Why? (optional)"
              spacing={1}
              useFlexGap
              sx={{ mt: 1, flexWrap: 'wrap', alignItems: 'center' }}
            >
              <Typography component="span" sx={{ fontSize: '0.75rem', opacity: 0.75, color: 'inherit' }}>
                Why?
              </Typography>
              {DISMISS_REASONS.map(({ code, label }) => {
                const on = pending.reason === code;
                return (
                  <Chip
                    key={code}
                    component="button"
                    type="button"
                    label={label}
                    size="small"
                    clickable
                    aria-pressed={on}
                    data-reason={code}
                    onClick={() => onReason(on ? null : code)}
                    sx={{
                      color: on ? 'grey.900' : 'common.white',
                      bgcolor: on ? 'common.white' : 'transparent',
                      border: '1px solid rgba(255,255,255,0.5)',
                      '&:hover': { bgcolor: on ? 'common.white' : 'rgba(255,255,255,0.12)' },
                      '&.Mui-focusVisible': { outline: '2px solid currentColor', outlineOffset: 2 }
                    }}
                  />
                );
              })}
            </Stack>
          </Box>
        }
        action={
          <Button
            color="inherit"
            size="small"
            autoFocus={pending.focusUndo}
            onClick={() => thenReturnFocus(onUndo)}
            sx={{ fontWeight: 700 }}
          >
            Undo
          </Button>
        }
      />
    </Snackbar>
  );
}
