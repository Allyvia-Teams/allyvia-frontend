import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
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
import { IconArrowDown, IconArrowUp, IconX } from '@tabler/icons-react';

import {
  approveSurveyDraft,
  cancelSurveyDraft,
  fetchSurveyDraft,
  updateSurveyDraft,
  type SurveyDraft,
  type SurveyQuestion,
  type SurveyQuestionType
} from 'api/innerCircle.api';
import { formatDate } from 'utils/dateUtils';

export interface SurveyDraftDrawerProps {
  draftId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

function reorderQuestions(questions: SurveyQuestion[], index: number, direction: 'up' | 'down'): SurveyQuestion[] {
  const next = [...questions].sort((a, b) => a.order - b.order);
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= next.length) return next;
  [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  return next.map((q, idx) => ({ ...q, order: idx }));
}

export default function SurveyDraftDrawer({ draftId, onClose, onUpdated }: SurveyDraftDrawerProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [cadenceDays, setCadenceDays] = useState(7);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: draft, isLoading, isError } = useQuery({
    queryKey: ['survey-draft', draftId],
    queryFn: () => fetchSurveyDraft(draftId!),
    enabled: draftId !== null
  });

  useEffect(() => {
    if (!draft) return;
    setQuestions([...draft.questions].sort((a, b) => a.order - b.order));
    setCadenceDays(draft.delivery_cadence_days);
  }, [draft]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateSurveyDraft(draftId!, {
        delivery_cadence_days: cadenceDays,
        questions: questions.map((q, idx) => ({
          id: q.id,
          text: q.text,
          question_type: q.question_type,
          options: q.question_type === 'text' ? [] : q.options,
          order: idx
        }))
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['survey-draft', draftId], updated);
      onUpdated();
      enqueueSnackbar('Survey draft saved', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to save draft', { variant: 'error' })
  });

  const approveMutation = useMutation({
    mutationFn: () => approveSurveyDraft(draftId!),
    onSuccess: () => {
      onUpdated();
      onClose();
      enqueueSnackbar('Survey approved and scheduled', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to approve survey', { variant: 'error' })
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelSurveyDraft(draftId!),
    onSuccess: () => {
      onUpdated();
      onClose();
      enqueueSnackbar('Survey cancelled', { variant: 'info' });
    },
    onError: () => enqueueSnackbar('Failed to cancel survey', { variant: 'error' })
  });

  const updateQuestion = (index: number, patch: Partial<SurveyQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    setQuestions((prev) => reorderQuestions(prev, index, direction));
  };

  const isBusy = saveMutation.isPending || approveMutation.isPending || cancelMutation.isPending;

  return (
    <>
      <Drawer
        anchor="right"
        open={draftId !== null}
        onClose={onClose}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 480 }, borderLeft: '1px solid', borderColor: 'divider' }
        }}
      >
        <Box sx={{ p: 2.5, height: '100%', overflowY: 'auto' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h4">Review survey</Typography>
            <IconButton onClick={onClose} size="small" aria-label="Close">
              <IconX size={18} />
            </IconButton>
          </Stack>

          {isLoading && (
            <Stack spacing={2}>
              <Skeleton variant="rounded" height={40} />
              <Skeleton variant="rounded" height={120} />
              <Skeleton variant="rounded" height={120} />
            </Stack>
          )}

          {isError && !isLoading && (
            <Typography color="error">Failed to load survey draft.</Typography>
          )}

          {!isLoading && !isError && draft && (
            <Stack spacing={2.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label="Draft" size="small" color="warning" />
                <Typography variant="caption" color="textSecondary" sx={{ alignSelf: 'center' }}>
                  Created {formatDate(draft.created_at, 'MMM dd, yyyy')}
                </Typography>
              </Stack>

              <TextField
                label="Delivery cadence (days)"
                type="number"
                size="small"
                value={cadenceDays}
                onChange={(e) => setCadenceDays(Math.max(1, Number(e.target.value) || 1))}
                inputProps={{ min: 1, max: 90 }}
                fullWidth
                disabled={isBusy}
              />

              <Divider />

              <Typography variant="subtitle1" fontWeight={700}>
                Questions ({questions.length})
              </Typography>

              {questions.map((question, index) => (
                <Box
                  key={question.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper'
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="textSecondary" fontWeight={700}>
                      Q{index + 1}
                    </Typography>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        disabled={index === 0 || isBusy}
                        onClick={() => moveQuestion(index, 'up')}
                        aria-label="Move up"
                      >
                        <IconArrowUp size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={index === questions.length - 1 || isBusy}
                        onClick={() => moveQuestion(index, 'down')}
                        aria-label="Move down"
                      >
                        <IconArrowDown size={16} />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      label="Type"
                      value={question.question_type}
                      onChange={(e) =>
                        updateQuestion(index, {
                          question_type: e.target.value as SurveyQuestionType,
                          options: e.target.value === 'text' ? [] : question.options.length ? question.options : ['Yes', 'Maybe', 'No']
                        })
                      }
                      disabled={isBusy}
                    >
                      <MenuItem value="multiple_choice">Multiple choice</MenuItem>
                      <MenuItem value="text">Free text</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Question"
                    size="small"
                    value={question.text}
                    onChange={(e) => updateQuestion(index, { text: e.target.value })}
                    fullWidth
                    multiline
                    minRows={2}
                    disabled={isBusy}
                    sx={{ mb: question.question_type === 'multiple_choice' ? 1.5 : 0 }}
                  />

                  {question.question_type === 'multiple_choice' && (
                    <TextField
                      label="Options (comma-separated)"
                      size="small"
                      value={question.options.join(', ')}
                      onChange={(e) =>
                        updateQuestion(index, {
                          options: e.target.value
                            .split(',')
                            .map((o) => o.trim())
                            .filter(Boolean)
                        })
                      }
                      fullWidth
                      disabled={isBusy}
                      helperText="3–4 shopper-friendly choices"
                    />
                  )}
                </Box>
              ))}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1 }}>
                <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={isBusy} fullWidth>
                  Save changes
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => setConfirmApprove(true)}
                  disabled={isBusy}
                  fullWidth
                >
                  Approve
                </Button>
                <Button variant="outlined" color="error" onClick={() => setConfirmCancel(true)} disabled={isBusy} fullWidth>
                  Cancel survey
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>
      </Drawer>

      <Dialog open={confirmApprove} onClose={() => setConfirmApprove(false)}>
        <DialogTitle>Approve this survey?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The survey will move to <strong>scheduled</strong> and be ready for delivery on your cadence (
            {cadenceDays} days).
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmApprove(false)}>Back</Button>
          <Button
            color="success"
            variant="contained"
            disabled={approveMutation.isPending}
            onClick={() => approveMutation.mutate(undefined, { onSettled: () => setConfirmApprove(false) })}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)}>
        <DialogTitle>Cancel this survey?</DialogTitle>
        <DialogContent>
          <DialogContentText>This draft will be marked cancelled and removed from the approval queue.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCancel(false)}>Back</Button>
          <Button
            color="error"
            variant="contained"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate(undefined, { onSettled: () => setConfirmCancel(false) })}
          >
            Cancel survey
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
