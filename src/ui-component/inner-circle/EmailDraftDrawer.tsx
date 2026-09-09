import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { IconX } from '@tabler/icons-react';

import {
  approveEmailDraft,
  dismissEmailDraft,
  fetchEmailDraft,
  updateEmailDraft,
  type EmailDraft,
  type EmailDraftStatus,
  type EmailDraftType
} from 'api/innerCircle.api';
import { formatDate } from 'utils/dateUtils';
import TierChip from './TierChip';
import { formatPct } from './formatters';

export interface EmailDraftDrawerProps {
  draftId: string | null;
  onClose: () => void;
}

export const DRAFT_STATUS_CONFIG: Record<EmailDraftStatus, { label: string; color: 'warning' | 'info' | 'success' | 'default' | 'error' }> =
  {
    draft: { label: 'Draft', color: 'warning' },
    approved: { label: 'Approved', color: 'info' },
    sent: { label: 'Sent', color: 'success' },
    dismissed: { label: 'Dismissed', color: 'default' },
    failed: { label: 'Failed', color: 'error' }
  };

export const DRAFT_TYPE_LABEL: Record<EmailDraftType, string> = {
  promotion: 'Promotion',
  perk_invite: 'Perk invite',
  vote_invite: 'Style vote invite',
  winback: 'Win-back',
  birthday: 'Birthday'
};

function ContextValue({ value }: { value: unknown }) {
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return (
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {(value as string[]).map((v) => (
          <Chip key={v} label={v} size="small" variant="outlined" />
        ))}
      </Stack>
    );
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <Typography variant="body2">{String(value)}</Typography>;
  }
  return (
    <Typography variant="body2" component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
      {JSON.stringify(value, null, 2)}
    </Typography>
  );
}

function contextKeyLabel(key: string): string {
  const label = key.replace(/_/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function EmailDraftDrawer({ draftId, onClose }: EmailDraftDrawerProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmDismiss, setConfirmDismiss] = useState(false);

  const {
    data: draft,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['ic-email-draft', draftId],
    queryFn: () => fetchEmailDraft(draftId!),
    enabled: draftId !== null
  });

  useEffect(() => {
    if (!draft) return;
    setSubject(draft.subject);
    setBodyHtml(draft.body_html);
  }, [draft]);

  const isDraft = draft?.status === 'draft';
  const isDirty = !!draft && (subject !== draft.subject || bodyHtml !== draft.body_html);

  const syncCaches = (updated: EmailDraft) => {
    queryClient.setQueryData(['ic-email-draft', draftId], updated);
    queryClient.invalidateQueries({ queryKey: ['ic-email-drafts'] });
  };

  const saveMutation = useMutation({
    mutationFn: () => updateEmailDraft(draftId!, { subject, body_html: bodyHtml }),
    onSuccess: (updated) => {
      syncCaches(updated);
      enqueueSnackbar('Draft saved', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to save draft', { variant: 'error' })
  });

  const approveMutation = useMutation({
    mutationFn: () => approveEmailDraft(draftId!),
    onSuccess: (updated) => {
      syncCaches(updated);
      if (updated.status === 'failed') {
        enqueueSnackbar('Send failed — see error details on the draft', { variant: 'error' });
      } else {
        enqueueSnackbar(`Email ${updated.status === 'sent' ? 'sent' : 'approved'} — ${updated.contact.name}`, { variant: 'success' });
        onClose();
      }
    },
    onError: () => enqueueSnackbar('Failed to approve draft', { variant: 'error' }),
    onSettled: () => setConfirmApprove(false)
  });

  const dismissMutation = useMutation({
    mutationFn: () => dismissEmailDraft(draftId!),
    onSuccess: (updated) => {
      syncCaches(updated);
      enqueueSnackbar('Draft dismissed', { variant: 'info' });
      onClose();
    },
    onError: () => enqueueSnackbar('Failed to dismiss draft', { variant: 'error' }),
    onSettled: () => setConfirmDismiss(false)
  });

  const isBusy = saveMutation.isPending || approveMutation.isPending || dismissMutation.isPending;

  const approveText = draft?.promo_code
    ? `This emails ${draft.contact.name} and issues a ${formatPct(draft.promo_code.discount_pct)} code.`
    : `This emails ${draft?.contact.name ?? 'the member'}.`;

  return (
    <>
      <Drawer
        anchor="right"
        open={draftId !== null}
        onClose={onClose}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 560 }, borderLeft: '1px solid', borderColor: 'divider' }
        }}
      >
        <Box sx={{ p: 2.5, height: '100%', overflowY: 'auto' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h4">Review email</Typography>
            <IconButton onClick={onClose} size="small" aria-label="Close email draft drawer">
              <IconX size={18} />
            </IconButton>
          </Stack>

          {isLoading && (
            <Stack spacing={2}>
              <Skeleton variant="rounded" height={56} />
              <Skeleton variant="rounded" height={40} />
              <Skeleton variant="rounded" height={220} />
            </Stack>
          )}

          {isError && !isLoading && <Typography color="error">Failed to load email draft.</Typography>}

          {!isLoading && !isError && draft && (
            <Stack spacing={2.5}>
              {/* Recipient + status */}
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="h5" sx={{ mr: 0.5 }}>
                    {draft.contact.name}
                  </Typography>
                  <TierChip tier={draft.contact.tier} level={draft.contact.tier_level} />
                  <Chip
                    label={DRAFT_STATUS_CONFIG[draft.status].label}
                    size="small"
                    color={DRAFT_STATUS_CONFIG[draft.status].color}
                    variant="filled"
                  />
                  <Chip label={DRAFT_TYPE_LABEL[draft.draft_type]} size="small" variant="outlined" />
                </Stack>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                  {draft.contact.email} · Created {formatDate(draft.created_at, 'MMM dd, yyyy')}
                  {draft.promotion_name ? ` · ${draft.promotion_name}` : ''}
                </Typography>
              </Box>

              {draft.status === 'failed' && draft.error_message && <Alert severity="error">Send failed: {draft.error_message}</Alert>}
              {draft.status === 'sent' && draft.sent_at && <Alert severity="success">Sent {formatDate(draft.sent_at, 'datetime')}</Alert>}
              {draft.status === 'approved' && draft.approved_at && (
                <Alert severity="info">Approved {formatDate(draft.approved_at, 'datetime')} — sending</Alert>
              )}

              {/* Promo code details */}
              {draft.promo_code && (
                <Box sx={{ p: 1.5, borderRadius: 2, border: '1px dashed', borderColor: 'divider', bgcolor: 'background.paper' }}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Promo code
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ fontFamily: 'monospace' }}>
                      {draft.promo_code.code}
                    </Typography>
                    <Chip label={`${formatPct(draft.promo_code.discount_pct)} off`} size="small" color="success" variant="outlined" />
                    <Typography variant="caption" color="textSecondary">
                      Expires {formatDate(draft.promo_code.expires_at, 'MMM dd, yyyy')} · {draft.promo_code.status}
                    </Typography>
                  </Stack>
                </Box>
              )}

              {/* Subject */}
              <TextField
                label="Subject"
                size="small"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                fullWidth
                disabled={!isDraft || isBusy}
              />

              {/* Rendered preview.
                  Note: body_html is generated by our own backend (not user-supplied),
                  so rendering it via dangerouslySetInnerHTML is acceptable here. */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Preview
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    maxHeight: 420,
                    overflowY: 'auto',
                    '& img': { maxWidth: '100%' }
                  }}
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              </Box>

              {isDraft && (
                <Accordion
                  disableGutters
                  elevation={0}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">Edit email body (HTML)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      value={bodyHtml}
                      onChange={(e) => setBodyHtml(e.target.value)}
                      fullWidth
                      multiline
                      minRows={8}
                      maxRows={20}
                      disabled={isBusy}
                      InputProps={{ sx: { fontFamily: 'monospace', fontSize: 12 } }}
                    />
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Personalization context */}
              <Accordion
                disableGutters
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">Personalization context</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                        Style tags
                      </Typography>
                      {draft.contact.style_tags.length === 0 ? (
                        <Typography variant="body2" color="textSecondary">
                          No style data yet.
                        </Typography>
                      ) : (
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          {draft.contact.style_tags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      )}
                    </Box>
                    {Object.entries(draft.personalization_context).map(([key, value]) => (
                      <Box key={key}>
                        <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                          {contextKeyLabel(key)}
                        </Typography>
                        <ContextValue value={value} />
                      </Box>
                    ))}
                    {Object.keys(draft.personalization_context).length === 0 && (
                      <Typography variant="body2" color="textSecondary">
                        No additional context recorded.
                      </Typography>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>

              {isDraft && (
                <>
                  <Divider />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    {isDirty && (
                      <Button variant="outlined" onClick={() => saveMutation.mutate()} disabled={isBusy} fullWidth>
                        Save changes
                      </Button>
                    )}
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => setConfirmApprove(true)}
                      disabled={isBusy || isDirty}
                      fullWidth
                    >
                      Approve &amp; Send
                    </Button>
                    <Button variant="outlined" color="error" onClick={() => setConfirmDismiss(true)} disabled={isBusy} fullWidth>
                      Dismiss
                    </Button>
                  </Stack>
                  {isDirty && (
                    <Typography variant="caption" color="textSecondary">
                      Save your edits before approving.
                    </Typography>
                  )}
                </>
              )}
            </Stack>
          )}
        </Box>
      </Drawer>

      <Dialog open={confirmApprove} onClose={() => setConfirmApprove(false)}>
        <DialogTitle>Approve and send?</DialogTitle>
        <DialogContent>
          <DialogContentText>{approveText}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmApprove(false)}>Back</Button>
          <Button color="success" variant="contained" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
            Approve &amp; Send
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDismiss} onClose={() => setConfirmDismiss(false)}>
        <DialogTitle>Dismiss this draft?</DialogTitle>
        <DialogContent>
          <DialogContentText>No email will be sent to {draft?.contact.name ?? 'this member'}.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDismiss(false)}>Back</Button>
          <Button color="error" variant="contained" disabled={dismissMutation.isPending} onClick={() => dismissMutation.mutate()}>
            Dismiss
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
