import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

// material-ui
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';

// icons
import { IconX, IconStar, IconStarFilled } from '@tabler/icons-react';

// project imports
import { AgentAPI } from 'api/agent.api';

// ==============================|| FEEDBACK BANNER ||============================== //

const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const theme = useTheme();
  const [hovered, setHovered] = useState(0);

  return (
    <Box display="flex" gap={0.5}>
      {[1, 2, 3, 4, 5].map((star) => (
        <IconButton
          key={star}
          size="small"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          sx={{ p: 0.25 }}
          aria-label={`Rate ${star} out of 5`}
        >
          {star <= (hovered || value) ? (
            <IconStarFilled size={20} color={theme.palette.warning.main} />
          ) : (
            <IconStar size={20} color={theme.palette.text.disabled} />
          )}
        </IconButton>
      ))}
    </Box>
  );
};

export const FeedbackBanner = () => {
  const [dismissed, setDismissed] = useState(false);
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

  if (!feedbackDue?.due || dismissed) {
    return null;
  }

  if (submitted) {
    return (
      <Paper elevation={0} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderRadius: 1, mb: 1 }}>
        <Typography variant="body2" color="success.main">
          Thanks for your feedback!
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: 1,
        mb: 1,
        flexWrap: 'wrap'
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        Were this week&apos;s recommendations useful?
      </Typography>
      <StarRating value={rating} onChange={setRating} />
      <Button
        size="small"
        variant="contained"
        disabled={rating === 0 || submitMutation.isPending}
        onClick={() => submitMutation.mutate(rating)}
        sx={{ minWidth: 60 }}
      >
        Submit
      </Button>
      <IconButton size="small" onClick={() => setDismissed(true)} sx={{ ml: 'auto' }} aria-label="Dismiss feedback banner">
        <IconX size={16} />
      </IconButton>
    </Paper>
  );
};

export default FeedbackBanner;
