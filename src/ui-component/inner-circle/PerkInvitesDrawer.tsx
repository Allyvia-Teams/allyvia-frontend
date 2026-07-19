import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
  Box,
  Chip,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { IconX } from '@tabler/icons-react';

import {
  fetchPerkInvites,
  updatePerkInvite,
  type PerkEvent,
  type PerkInvite,
  type PerkInviteStatus,
  type PerkInviteUpdate
} from 'api/innerCircle.api';
import { formatDate } from 'utils/dateUtils';
import TierChip from './TierChip';
import { formatCurrency } from './formatters';

export interface PerkInvitesDrawerProps {
  perk: PerkEvent | null;
  onClose: () => void;
}

const STATUS_OPTIONS: Array<{ value: PerkInviteStatus; label: string }> = [
  { value: 'invited', label: 'Invited' },
  { value: 'interested', label: 'Interested' },
  { value: 'booked', label: 'Booked' },
  { value: 'declined', label: 'Declined' }
];

const STATUS_CHIP: Record<PerkInviteStatus, 'default' | 'info' | 'success' | 'error'> = {
  invited: 'default',
  interested: 'info',
  booked: 'success',
  declined: 'error'
};

export default function PerkInvitesDrawer({ perk, onClose }: PerkInvitesDrawerProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const perkId = perk?.id ?? null;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ic-perk-invites', perkId],
    queryFn: () => fetchPerkInvites(perkId!),
    enabled: perkId !== null
  });

  const invites: PerkInvite[] = data ?? [];

  // Local notes buffer so typing doesn't fire a PATCH per keystroke; saved on blur.
  const [notesByInvite, setNotesByInvite] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    const next: Record<string, string> = {};
    data.forEach((invite) => {
      next[invite.id] = invite.notes;
    });
    setNotesByInvite(next);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: ({ inviteId, patch }: { inviteId: string; patch: PerkInviteUpdate }) => updatePerkInvite(inviteId, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData<PerkInvite[]>(['ic-perk-invites', perkId], (prev) =>
        (prev ?? []).map((invite) => (invite.id === updated.id ? updated : invite))
      );
      queryClient.invalidateQueries({ queryKey: ['ic-perks'] });
    },
    onError: () => enqueueSnackbar('Failed to update invite', { variant: 'error' })
  });

  const saveNotes = (invite: PerkInvite) => {
    const value = notesByInvite[invite.id] ?? '';
    if (value === invite.notes) return;
    updateMutation.mutate({ inviteId: invite.id, patch: { notes: value } });
  };

  return (
    <Drawer
      anchor="right"
      open={perk !== null}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 480 }, borderLeft: '1px solid', borderColor: 'divider' }
      }}
    >
      <Box sx={{ p: 2.5, height: '100%', overflowY: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="h4" noWrap>
            {perk?.title ?? 'Perk'}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close invites drawer">
            <IconX size={18} />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Invites and RSVPs
        </Typography>

        {isLoading && (
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={120} />
            ))}
          </Stack>
        )}

        {isError && !isLoading && <Typography color="error">Failed to load invites.</Typography>}

        {!isLoading && !isError && invites.length === 0 && (
          <Typography color="textSecondary" variant="body2">
            No invites yet. Use “Invite eligible members” on the perk card to generate invitation emails.
          </Typography>
        )}

        {!isLoading && !isError && invites.length > 0 && (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack spacing={2}>
              {invites.map((invite) => (
                <Box
                  key={invite.id}
                  sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1.5 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2" fontWeight={700} noWrap>
                          {invite.contact.name}
                        </Typography>
                        <TierChip tier={invite.contact.tier} />
                      </Stack>
                      <Typography variant="caption" color="textSecondary" display="block" noWrap>
                        {invite.contact.email} · LTV {formatCurrency(invite.contact.ltv)}
                      </Typography>
                      {invite.responded_at && (
                        <Typography variant="caption" color="textSecondary" display="block">
                          Responded {formatDate(invite.responded_at, 'MMM dd, yyyy')}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={STATUS_OPTIONS.find((opt) => opt.value === invite.status)?.label ?? invite.status}
                      size="small"
                      color={STATUS_CHIP[invite.status]}
                      variant="outlined"
                    />
                  </Stack>

                  <Stack spacing={1.5}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        label="Status"
                        value={invite.status}
                        disabled={updateMutation.isPending}
                        onChange={(e) =>
                          updateMutation.mutate({
                            inviteId: invite.id,
                            patch: { status: e.target.value as PerkInviteStatus }
                          })
                        }
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {invite.status === 'booked' && (
                      <DateTimePicker
                        label="Scheduled for"
                        value={invite.scheduled_at ? new Date(invite.scheduled_at) : null}
                        onChange={(value: Date | null) =>
                          updateMutation.mutate({
                            inviteId: invite.id,
                            patch: { scheduled_at: value && !Number.isNaN(value.getTime()) ? value.toISOString() : null }
                          })
                        }
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                      />
                    )}

                    <TextField
                      label="Notes"
                      size="small"
                      value={notesByInvite[invite.id] ?? ''}
                      onChange={(e) => setNotesByInvite((prev) => ({ ...prev, [invite.id]: e.target.value }))}
                      onBlur={() => saveNotes(invite)}
                      fullWidth
                      multiline
                      minRows={1}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </LocalizationProvider>
        )}
      </Box>
    </Drawer>
  );
}
