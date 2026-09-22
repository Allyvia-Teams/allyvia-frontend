import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { Box, Button, Chip, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { alpha, useTheme } from '@mui/material/styles';

import { fetchPublicVote, submitPublicVote, type PublicVoteOption } from 'api/innerCircle.api';

// ---------------------------------------------------------------------------
// Shared layout helpers (mirrors PublicSurveyPage)
// ---------------------------------------------------------------------------

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        p: 2
      }}
    >
      <Paper
        elevation={0}
        sx={{ p: 4, maxWidth: 420, width: '100%', textAlign: 'center', borderRadius: 4, border: '1px solid', borderColor: 'divider' }}
      >
        {children}
      </Paper>
    </Box>
  );
}

function BrandHeader({ companyName, brandColor, subtitle }: { companyName: string; brandColor: string; subtitle?: string }) {
  const theme = useTheme();
  const onBrand = theme.palette.getContrastText(brandColor);
  const waveFill = theme.palette.grey[50];

  return (
    <Box
      sx={{
        position: 'relative',
        background: `linear-gradient(150deg, ${brandColor} 0%, ${alpha(brandColor, 0.72)} 55%, ${alpha(theme.palette.common.black, 0.18)} 140%)`,
        color: onBrand,
        px: 2,
        pt: 5,
        pb: 7
      }}
    >
      <Container maxWidth="sm" disableGutters>
        <Typography variant="overline" sx={{ opacity: 0.9, letterSpacing: 2, fontWeight: 700 }}>
          {companyName}
        </Typography>
        <Typography variant="h5" sx={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>
          {subtitle ?? 'Style Vote'}
        </Typography>
      </Container>
      <Box
        component="svg"
        viewBox="0 0 500 60"
        preserveAspectRatio="none"
        sx={{ position: 'absolute', bottom: -1, left: 0, width: '100%', height: 60, display: 'block' }}
      >
        <path d="M0,40 C150,75 350,5 500,40 L500,60 L0,60 Z" fill={waveFill} />
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Ballot
// ---------------------------------------------------------------------------

function BallotOption({
  option,
  selected,
  brandColor,
  disabled,
  onSelect
}: {
  option: PublicVoteOption;
  selected: boolean;
  brandColor: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <Paper
      elevation={0}
      onClick={disabled ? undefined : onSelect}
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      aria-label={option.description ? `${option.label} — ${option.description}` : option.label}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        cursor: disabled ? 'default' : 'pointer',
        border: '2px solid',
        borderColor: selected ? brandColor : 'divider',
        bgcolor: selected ? alpha(brandColor, 0.08) : 'background.paper',
        transition: 'border-color 0.15s, background-color 0.15s',
        '&:hover': {
          borderColor: disabled || selected ? undefined : alpha(brandColor, 0.45)
        },
        '&:focus-visible': {
          outline: `2px solid ${brandColor}`,
          outlineOffset: 2
        }
      }}
    >
      {option.image_url && (
        <Box
          component="img"
          src={option.image_url}
          alt=""
          sx={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
          // A broken image URL should not leave a torn layout behind.
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={selected ? 700 : 500}>{option.label}</Typography>
          {option.description && (
            <Typography variant="body2" color="textSecondary">
              {option.description}
            </Typography>
          )}
        </Box>
        {/* Fixed box: as a bare flex item the icon claims the whole row on
            narrow viewports, squeezing the label to one word per line. */}
        {selected && <CheckCircleIcon sx={{ color: brandColor, flex: '0 0 24px', width: 24, height: 24 }} />}
      </Stack>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PublicVotePage() {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const {
    data: vote,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['public-vote', token],
    queryFn: () => fetchPublicVote(token),
    enabled: token.length > 0,
    retry: false
  });

  // Preselect whatever they already chose, so changing a vote starts from it.
  useEffect(() => {
    if (vote?.voted_option_index != null) setSelected(vote.voted_option_index);
  }, [vote?.voted_option_index]);

  const submitMutation = useMutation({
    mutationFn: (optionIndex: number) => submitPublicVote(token, optionIndex)
  });

  const brandColor = vote?.company.brand_color || theme.palette.primary.main;
  const onBrand = theme.palette.getContrastText(brandColor);

  const handleSubmit = async () => {
    if (selected == null) return;
    try {
      await submitMutation.mutateAsync(selected);
      setFinished(true);
    } catch {
      // Error state handled via submitMutation.isError
    }
  };

  // ---- Loading ----------------------------------------------------------
  if (isLoading) {
    return (
      <CenteredCard>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography color="textSecondary">Loading your vote…</Typography>
        </Stack>
      </CenteredCard>
    );
  }

  // ---- Missing / invalid token ------------------------------------------
  if (!token || isError || !vote) {
    return (
      <CenteredCard>
        <Stack spacing={1.5} alignItems="center">
          <Typography sx={{ fontSize: 56 }}>🔒</Typography>
          <Typography variant="h3">Link invalid</Typography>
          <Typography color="textSecondary">This voting link is not valid. Please use the most recent link from your email.</Typography>
        </Stack>
      </CenteredCard>
    );
  }

  // ---- Nothing open for this member -------------------------------------
  if (vote.state === 'expired' || !vote.round) {
    return (
      <CenteredCard>
        <Stack spacing={1.5} alignItems="center">
          <Typography sx={{ fontSize: 56 }}>⏰</Typography>
          <Typography variant="h3">Voting has closed</Typography>
          <Typography color="textSecondary">
            There is no open style vote for you right now. Thank you for being part of {vote.company.name}&apos;s Inner Circle.
          </Typography>
        </Stack>
      </CenteredCard>
    );
  }

  const round = vote.round;

  // ---- Already voted ----------------------------------------------------
  if (vote.state === 'completed' && !finished) {
    const votedLabel = round.options.find((o) => o.option_index === vote.voted_option_index)?.label;
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
        <BrandHeader companyName={vote.company.name} brandColor={brandColor} subtitle="Your vote is in" />
        <Container maxWidth="sm" sx={{ mt: -2, position: 'relative', pb: 6 }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Typography sx={{ fontSize: 48, mb: 1 }}>🗳️</Typography>
            <Typography variant="h3" gutterBottom>
              You voted for {votedLabel ?? 'your pick'}
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 3 }}>
              Thanks — {vote.company.name} will use this to decide what to bring in next.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => {
                setFinished(false);
                refetch();
              }}
              sx={{ borderRadius: 999, textTransform: 'none', borderColor: brandColor, color: brandColor }}
            >
              Change my vote
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  // ---- Just submitted ---------------------------------------------------
  if (finished) {
    const votedLabel = round.options.find((o) => o.option_index === selected)?.label;
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
        <BrandHeader companyName={vote.company.name} brandColor={brandColor} subtitle="Thank you" />
        <Container maxWidth="sm" sx={{ mt: -2, position: 'relative', pb: 6 }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Typography sx={{ fontSize: 48, mb: 1 }}>🎉</Typography>
            <Typography variant="h3" gutterBottom>
              Vote counted
            </Typography>
            <Typography color="textSecondary">
              You picked <strong>{votedLabel}</strong>. Your taste helps {vote.company.name} decide what to stock next.
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  // ---- Open ballot ------------------------------------------------------
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', pb: 6 }}>
      <BrandHeader companyName={vote.company.name} brandColor={brandColor} />

      <Container maxWidth="sm" sx={{ mt: -2, position: 'relative' }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.35 }}>
                {round.title}
              </Typography>
              {round.description && (
                <Typography color="textSecondary" sx={{ mt: 0.75 }}>
                  {round.description}
                </Typography>
              )}
              {round.closes_at && (
                <Chip
                  label={`Voting closes ${new Date(round.closes_at).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric'
                  })}`}
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1.5 }}
                />
              )}
            </Box>

            <Stack spacing={1.5} role="radiogroup" aria-label={round.title}>
              {round.options.map((option) => (
                <BallotOption
                  key={option.option_index}
                  option={option}
                  selected={selected === option.option_index}
                  brandColor={brandColor}
                  disabled={submitMutation.isPending}
                  onSelect={() => setSelected(option.option_index)}
                />
              ))}
            </Stack>

            {submitMutation.isError && (
              <Typography color="error" variant="body2">
                Could not record your vote. Please try again.
              </Typography>
            )}

            <Button
              variant="contained"
              size="large"
              disabled={selected == null || submitMutation.isPending}
              onClick={handleSubmit}
              sx={{
                mt: 1,
                py: 1.5,
                borderRadius: 999,
                fontWeight: 700,
                bgcolor: brandColor,
                color: onBrand,
                '&:hover': { bgcolor: alpha(brandColor, 0.88) },
                '&.Mui-disabled': { bgcolor: alpha(brandColor, 0.35), color: alpha(onBrand, 0.7) }
              }}
            >
              {submitMutation.isPending ? 'Saving…' : 'Submit my vote'}
            </Button>
          </Stack>
        </Paper>

        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', mt: 3, opacity: 0.85 }}>
          Powered by Allyvia Inner Circle · Made with ❤️ by humans on Earth
        </Typography>
      </Container>
    </Box>
  );
}
