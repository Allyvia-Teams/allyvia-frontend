import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

// material-ui
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';

// icons
import { IconStar, IconStarFilled } from '@tabler/icons-react';

// project imports
import { AgentAPI } from 'api/agent.api';
import { formatSavingsDollars } from 'api/agentFeedback';
import { RailCard } from 'ui-component/frame';

// ==============================|| FEEDBACK - WEEKLY ASK ||============================== //
// Design handoff Part 2: a rail card — question 13/600, 18px stars, a 30px ink
// Submit. There is no dismiss: the stars render whenever `feedbackDue.due`.

const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const theme = useTheme();
  const [hovered, setHovered] = useState(0);

  return (
    <Box display="flex" gap="3px" role="radiogroup" aria-label="Rate this week's recommendations">
      {[1, 2, 3, 4, 5].map((star) => (
        <IconButton
          key={star}
          size="small"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          sx={{ p: '3px', minWidth: 0, minHeight: 0 }}
          role="radio"
          aria-checked={value === star}
          aria-label={`Rate ${star} out of 5`}
        >
          {star <= (hovered || value) ? (
            <IconStarFilled size={18} color={theme.palette.warning.main} />
          ) : (
            <IconStar size={18} color={theme.palette.text.disabled} />
          )}
        </IconButton>
      ))}
    </Box>
  );
};

export const FeedbackBanner = () => {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const { data: feedbackDue } = useQuery({
    queryKey: ['agent-feedback-due'],
    queryFn: () => AgentAPI.Feedback.isDue(),
    staleTime: 10 * 60 * 1000,
    retry: false
  });

  const submitMutation = useMutation({
    mutationFn: (r: number) => AgentAPI.Feedback.submit(r),
    onSuccess: () => {
      setSubmitted(true);
    }
  });

  if (!feedbackDue?.due) {
    return null;
  }

  // The verified result this week's ask is anchored to, when the loop has one.
  // Leading with it changes the question from "rate us" to "here is what this
  // was worth — was it right?", which is a question a merchant has grounds to
  // answer. Absent, the plain weekly ask is unchanged.
  const anchor = feedbackDue.anchor ?? null;

  if (submitted) {
    return (
      <RailCard padded>
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'success.dark' }}>Thanks for your feedback.</Typography>
      </RailCard>
    );
  }

  return (
    <RailCard padded>
      {anchor ? (
        <>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.dark', lineHeight: 1.35 }}>
            Allyvia found you {formatSavingsDollars(anchor.dollar_value)} on {anchor.metric}
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: '2px' }}>
            {anchor.window} · was this recommendation useful?
          </Typography>
        </>
      ) : (
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.dark', lineHeight: 1.35 }}>
          Were this week&apos;s recommendations useful?
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: '9px', flexWrap: 'wrap' }}>
        <StarRating value={rating} onChange={setRating} />
        <Button
          size="small"
          variant="contained"
          disabled={rating === 0 || submitMutation.isPending}
          onClick={() => submitMutation.mutate(rating)}
          sx={{ minWidth: 64, minHeight: 30, py: 0 }}
        >
          Submit
        </Button>
      </Box>
    </RailCard>
  );
};

export default FeedbackBanner;
