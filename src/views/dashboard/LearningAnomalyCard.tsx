import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Alert, Box, Button, Collapse, Stack, TextField, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';

import { answerLearningAnomaly, getLearningAnomalies } from 'api/scheduling.api';
import { Panel } from 'ui-component/frame';
import {
  EXCLUSIONS_BLURB,
  PROMPT_QUESTION,
  promptActions,
  promptHeadline,
  promptPanelTitle
} from 'ui-component/scheduling/learningExclusions';
import type { LearningAnomalyPrompt } from 'types/scheduling';

export const LEARNING_ANOMALY_QUERY_KEY = ['learning-anomalies', 'pending'];

/**
 * "Friday ran 40% under what I expected. Anything going on I should ignore?"
 *
 * Sits beside the AI recommendations because it is the same kind of thing from
 * the owner's side — Allyvia noticed something and wants a decision. It is a
 * separate endpoint and a separate row type on purpose: a question is not a
 * recommendation, and minting an agent.Recommendation per curious Friday would
 * put questions into the verified-savings arithmetic.
 *
 * Renders NOTHING when there is nothing to ask, including on error. A card
 * that says "couldn't load your questions" is worse than silence here: there
 * is no action the owner can take, and the nightly detector will raise the
 * same prompt again tomorrow.
 */
const PromptRow = ({ prompt, onAnswered }: { prompt: LearningAnomalyPrompt; onAnswered: () => void }) => {
  const theme = useTheme();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const answer = useMutation({
    mutationFn: (payload: { exclude: boolean; note?: string }) => answerLearningAnomaly(prompt.id, payload),
    onSuccess: () => {
      setError(null);
      onAnswered();
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        // Already answered — a double tap, or another tab. The owner's intent
        // is satisfied either way, so refresh rather than show a failure.
        onAnswered();
        return;
      }
      setError("That didn't save. Try again.");
    }
  });

  const actions = promptActions();

  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: 1.5,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.primary.light, 0.04)
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <HelpOutlineOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', mt: 0.25 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600}>
            {promptHeadline(prompt)}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.25 }}>
            {PROMPT_QUESTION}
          </Typography>

          <Collapse in={noteOpen}>
            <TextField
              fullWidth
              size="small"
              sx={{ mt: 1.25 }}
              placeholder="What happened? (optional)"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 255))}
              inputProps={{ 'aria-label': 'What happened' }}
            />
          </Collapse>

          {error && (
            <Alert severity="error" sx={{ mt: 1.25 }}>
              {error}
            </Alert>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            {actions.map((action) =>
              action.key === 'exclude' ? (
                <Button
                  key={action.key}
                  size="small"
                  variant="contained"
                  disabled={answer.isPending}
                  onClick={() => {
                    // First tap reveals the note; second commits. The note is
                    // optional and must never become a step that blocks the
                    // answer, so the button text says what it will do.
                    if (!noteOpen) {
                      setNoteOpen(true);
                      return;
                    }
                    answer.mutate({ exclude: true, note: note.trim() || undefined });
                  }}
                >
                  {noteOpen ? 'Ignore this day' : action.label}
                </Button>
              ) : (
                <Button
                  key={action.key}
                  size="small"
                  variant="text"
                  color="inherit"
                  disabled={answer.isPending}
                  onClick={() => answer.mutate({ exclude: false })}
                >
                  {action.label}
                </Button>
              )
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

const LearningAnomalyCard = () => {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: LEARNING_ANOMALY_QUERY_KEY,
    queryFn: () => getLearningAnomalies({ status: 'pending' }),
    // A member gets a 403 here by design (the rows carry a day's revenue).
    // Never retry it — it is not a blip, and retrying would hammer the
    // endpoint on every non-admin dashboard load.
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 403 || status === 401) return false;
      return failureCount < 2;
    }
  });

  const prompts = data?.items ?? [];
  if (prompts.length === 0) return null;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: LEARNING_ANOMALY_QUERY_KEY });
  };

  return (
    <Panel title={promptPanelTitle(prompts.length)}>
      <Stack spacing={1.5} sx={{ p: 1.75 }}>
        <Typography variant="body2" color="textSecondary">
          {EXCLUSIONS_BLURB}
        </Typography>
        {prompts.map((prompt) => (
          <PromptRow key={prompt.id} prompt={prompt} onAnswered={refresh} />
        ))}
      </Stack>
    </Panel>
  );
};

export default LearningAnomalyCard;
