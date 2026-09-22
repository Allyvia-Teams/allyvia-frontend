import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { Box, Button, CircularProgress, Container, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { fetchPublicSurvey, submitSurveyAnswer, type PublicSurveyQuestion } from 'api/innerCircle.api';

// ---------------------------------------------------------------------------
// Shared layout helpers (mirrors PublicProfilePage)
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
          {subtitle ?? 'Quick Survey'}
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
// Question UI
// ---------------------------------------------------------------------------

function MultipleChoiceOptions({
  options,
  selected,
  brandColor,
  onSelect
}: {
  options: string[];
  selected: string;
  brandColor: string;
  onSelect: (value: string) => void;
}) {
  return (
    <Stack spacing={1.25}>
      {options.map((option) => {
        const isSelected = selected === option;
        return (
          <Paper
            key={option}
            elevation={0}
            onClick={() => onSelect(option)}
            sx={{
              p: 2,
              borderRadius: 3,
              cursor: 'pointer',
              border: '2px solid',
              borderColor: isSelected ? brandColor : 'divider',
              bgcolor: isSelected ? alpha(brandColor, 0.08) : 'background.paper',
              transition: 'border-color 0.15s, background-color 0.15s',
              '&:hover': {
                borderColor: isSelected ? brandColor : alpha(brandColor, 0.45)
              }
            }}
          >
            <Typography fontWeight={isSelected ? 700 : 500}>{option}</Typography>
          </Paper>
        );
      })}
    </Stack>
  );
}

function QuestionStep({
  question,
  brandColor,
  value,
  onChange
}: {
  question: PublicSurveyQuestion;
  brandColor: string;
  value: string;
  onChange: (value: string) => void;
}) {
  if (question.question_type === 'text') {
    return (
      <TextField
        fullWidth
        multiline
        minRows={4}
        placeholder="Share your thoughts…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root.Mui-focused fieldset': {
            borderColor: brandColor
          }
        }}
      />
    );
  }

  return <MultipleChoiceOptions options={question.options} selected={value} brandColor={brandColor} onSelect={onChange} />;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PublicSurveyPage() {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);

  const {
    data: survey,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['public-survey', token],
    queryFn: () => fetchPublicSurvey(token),
    enabled: token.length > 0,
    retry: false
  });

  const questions = survey?.questions ?? [];
  const answeredIds = useMemo(() => new Set(survey?.answered_question_ids ?? []), [survey?.answered_question_ids]);

  // Resume from first unanswered question after load
  useEffect(() => {
    if (!survey || survey.state !== 'open' || questions.length === 0) return;
    const firstUnanswered = questions.findIndex((q) => !answeredIds.has(q.id));
    setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
  }, [survey, questions, answeredIds]);

  const submitMutation = useMutation({
    mutationFn: ({ questionId, responseValue }: { questionId: string; responseValue: string }) =>
      submitSurveyAnswer(token, questionId, responseValue)
  });

  const brandColor = survey?.company.brand_color || theme.palette.primary.main;
  const onBrand = theme.palette.getContrastText(brandColor);
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] ?? '') : '';
  const isLastQuestion = currentIndex >= questions.length - 1;
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const canAdvance = currentAnswer.trim().length > 0 && !submitMutation.isPending;

  const handleNext = async () => {
    if (!currentQuestion || !canAdvance) return;

    try {
      const result = await submitMutation.mutateAsync({
        questionId: currentQuestion.id,
        responseValue: currentAnswer.trim()
      });

      if (result.status === 'completed') {
        setFinished(true);
        return;
      }

      if (isLastQuestion) {
        setFinished(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
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
          <Typography color="textSecondary">Loading survey…</Typography>
        </Stack>
      </CenteredCard>
    );
  }

  // ---- Missing / invalid token ------------------------------------------
  if (!token || isError || !survey) {
    return (
      <CenteredCard>
        <Stack spacing={1.5} alignItems="center">
          <Typography sx={{ fontSize: 56 }}>🔒</Typography>
          <Typography variant="h3">Link invalid</Typography>
          <Typography color="textSecondary">This survey link is not valid. Please use the most recent link from your email.</Typography>
        </Stack>
      </CenteredCard>
    );
  }

  // ---- Expired ----------------------------------------------------------
  if (survey.state === 'expired') {
    return (
      <CenteredCard>
        <Stack spacing={1.5} alignItems="center">
          <Typography sx={{ fontSize: 56 }}>⏰</Typography>
          <Typography variant="h3">This survey link has expired</Typography>
          <Typography color="textSecondary">
            Surveys from {survey.company.name} are only open for a limited time. Thank you for being part of Inner Circle.
          </Typography>
        </Stack>
      </CenteredCard>
    );
  }

  // ---- Already completed ------------------------------------------------
  if (survey.state === 'completed' || finished) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
        <BrandHeader companyName={survey.company.name} brandColor={brandColor} subtitle="Thank you" />
        <Container maxWidth="sm" sx={{ mt: -2, position: 'relative', pb: 6 }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
            <Typography sx={{ fontSize: 48, mb: 1 }}>🙏</Typography>
            {survey.state === 'completed' && !finished ? (
              <>
                <Typography variant="h3" gutterBottom>
                  You&apos;ve already submitted your response
                </Typography>
                <Typography color="textSecondary">Thanks — your feedback for {survey.company.name} is on record.</Typography>
              </>
            ) : (
              <>
                <Typography variant="h3" gutterBottom>
                  Thank you!
                </Typography>
                <Typography color="textSecondary">Your feedback helps {survey.company.name} make better buying decisions.</Typography>
              </>
            )}
          </Paper>
        </Container>
      </Box>
    );
  }

  // ---- Open survey flow -------------------------------------------------
  if (!currentQuestion) {
    return (
      <CenteredCard>
        <Typography color="textSecondary">This survey has no questions yet.</Typography>
      </CenteredCard>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', pb: 6 }}>
      <BrandHeader companyName={survey.company.name} brandColor={brandColor} />

      <Container maxWidth="sm" sx={{ mt: -2, position: 'relative' }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="caption" color="textSecondary" fontWeight={600}>
                Question {currentIndex + 1} of {questions.length}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  mt: 1,
                  height: 6,
                  borderRadius: 999,
                  bgcolor: alpha(brandColor, 0.12),
                  '& .MuiLinearProgress-bar': { bgcolor: brandColor, borderRadius: 999 }
                }}
              />
            </Box>

            <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.35 }}>
              {currentQuestion.text}
            </Typography>

            <QuestionStep
              question={currentQuestion}
              brandColor={brandColor}
              value={currentAnswer}
              onChange={(val) => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }))}
            />

            {submitMutation.isError && (
              <Typography color="error" variant="body2">
                Could not save your answer. Please try again.
              </Typography>
            )}

            <Button
              variant="contained"
              size="large"
              disabled={!canAdvance}
              onClick={handleNext}
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
              {submitMutation.isPending ? 'Saving…' : isLastQuestion ? 'Submit' : 'Next'}
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
