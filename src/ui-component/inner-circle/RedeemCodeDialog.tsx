import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import {
  redeemPromoCode,
  validatePromoCode,
  type PromoCodeInvalidReason,
  type PromoCodeValidationResult
} from 'api/innerCircle.api';
import { formatDate } from 'utils/dateUtils';
import { formatPct } from './formatters';

export interface RedeemCodeDialogProps {
  open: boolean;
  onClose: () => void;
}

const INVALID_REASON_LABEL: Record<PromoCodeInvalidReason, string> = {
  not_found: 'Code not found. Check the spelling and try again.',
  expired: 'This code has expired.',
  redeemed: 'This code has already been redeemed.',
  void: 'This code is no longer valid.'
};

function invalidMessage(result: PromoCodeValidationResult): string {
  return result.reason ? INVALID_REASON_LABEL[result.reason] : 'This code is not valid.';
}

export default function RedeemCodeDialog({ open, onClose }: RedeemCodeDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  const [code, setCode] = useState('');
  const [validation, setValidation] = useState<PromoCodeValidationResult | null>(null);
  const [redeemed, setRedeemed] = useState(false);

  const reset = () => {
    setCode('');
    setValidation(null);
    setRedeemed(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validateMutation = useMutation({
    mutationFn: (value: string) => validatePromoCode(value),
    onSuccess: (result) => setValidation(result),
    onError: () => enqueueSnackbar('Failed to check code', { variant: 'error' })
  });

  const redeemMutation = useMutation({
    mutationFn: (value: string) => redeemPromoCode(value),
    onSuccess: (result) => {
      setValidation(result);
      if (result.valid) {
        setRedeemed(true);
        enqueueSnackbar(`Code redeemed — ${formatPct(result.discount_pct)} off`, { variant: 'success' });
      }
    },
    onError: () => enqueueSnackbar('Failed to redeem code', { variant: 'error' })
  });

  const isBusy = validateMutation.isPending || redeemMutation.isPending;
  const trimmedCode = code.trim();

  const check = () => {
    if (!trimmedCode) return;
    setValidation(null);
    setRedeemed(false);
    validateMutation.mutate(trimmedCode);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Redeem code</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1.5}>
            <TextField
              label="Promo code"
              size="small"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setValidation(null);
                setRedeemed(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') check();
              }}
              fullWidth
              autoFocus
              disabled={isBusy || redeemed}
              InputProps={{ sx: { fontFamily: 'monospace' } }}
            />
            <Button variant="outlined" onClick={check} disabled={!trimmedCode || isBusy || redeemed} sx={{ flexShrink: 0 }}>
              {validateMutation.isPending ? 'Checking…' : 'Check'}
            </Button>
          </Stack>

          {validation && !validation.valid && <Alert severity="error">{invalidMessage(validation)}</Alert>}

          {validation && validation.valid && (
            <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {validation.contact_name ?? 'Inner Circle member'}
                  </Typography>
                  <Chip label={`${formatPct(validation.discount_pct)} off`} size="small" color="success" />
                  {redeemed && <Chip label="Redeemed" size="small" color="success" variant="outlined" />}
                </Stack>
                {validation.expires_at && (
                  <Typography variant="caption" color="textSecondary">
                    Valid until {formatDate(validation.expires_at, 'MMM dd, yyyy')}
                  </Typography>
                )}
                {redeemed ? (
                  <Typography variant="body2" color="success.main">
                    Apply {formatPct(validation.discount_pct)} off at the register.
                  </Typography>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => redeemMutation.mutate(trimmedCode)}
                    disabled={isBusy}
                    sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                  >
                    {redeemMutation.isPending ? 'Redeeming…' : 'Confirm redeem'}
                  </Button>
                )}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {redeemed && (
          <Button onClick={reset} sx={{ textTransform: 'none' }}>
            Redeem another
          </Button>
        )}
        <Button onClick={handleClose}>{redeemed ? 'Done' : 'Close'}</Button>
      </DialogActions>
    </Dialog>
  );
}
