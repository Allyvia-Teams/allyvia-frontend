import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import { Box, Button, Chip, Grid, Paper, Skeleton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PollOutlinedIcon from '@mui/icons-material/PollOutlined';

import { fetchSurveyDrafts, generateSurveyDraft, type SurveyDraft, type SurveyDraftStatus } from 'api/innerCircle.api';
import { gridSpacing } from 'store/constant';
import { formatDate } from 'utils/dateUtils';
import MainCard from 'ui-component/cards/MainCard';
import SurveyDraftDrawer from './SurveyDraftDrawer';

const STATUS_CONFIG: Record<
  SurveyDraftStatus,
  { label: string; color: 'warning' | 'primary' | 'success' | 'default' }
> = {
  draft: { label: 'Draft', color: 'warning' },
  scheduled: { label: 'Scheduled', color: 'primary' },
  sent: { label: 'Sent', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'default' }
};

function StatusBadge({ status }: { status: SurveyDraftStatus }) {
  const config = STATUS_CONFIG[status];
  return <Chip label={config.label} size="small" color={config.color} variant="filled" />;
}

function DraftCard({ draft, onClick }: { draft: SurveyDraft; onClick: () => void }) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'box-shadow .2s, border-color .2s',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
        }
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            Trend survey · {draft.question_count} question{draft.question_count === 1 ? '' : 's'}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            Created {formatDate(draft.created_at, 'MMM dd, yyyy')}
          </Typography>
        </Box>
        <StatusBadge status={draft.status} />
      </Stack>
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Typography variant="caption" color="textSecondary">
          Cadence: every {draft.delivery_cadence_days} days
        </Typography>
        {draft.response_count > 0 && (
          <Typography variant="caption" color="textSecondary">
            {draft.response_count} response{draft.response_count === 1 ? '' : 's'}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

function EmptyState() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 5,
        textAlign: 'center',
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider'
      }}
    >
      <PollOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
      <Typography variant="h4" gutterBottom>
        No survey drafts yet
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 420, mx: 'auto' }}>
        When trend signals are detected, AI-generated survey drafts will appear here for your review and approval.
      </Typography>
    </Paper>
  );
}

export default function SurveyDraftsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const {
    data: drafts = [],
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['survey-drafts'],
    queryFn: fetchSurveyDrafts
  });

  const generateMutation = useMutation({
    mutationFn: generateSurveyDraft,
    onSuccess: (draft) => {
      refetch();
      setSelectedDraftId(draft.id);
      enqueueSnackbar('Survey draft generated', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to generate survey draft', { variant: 'error' })
  });

  return (
    <MainCard
      title="Survey drafts"
      content={false}
      secondary={
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          disabled={generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
          sx={{ textTransform: 'none' }}
        >
          {generateMutation.isPending ? 'Generating…' : 'Generate survey draft'}
        </Button>
      }
    >
      <Box sx={{ p: gridSpacing }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2.5 }}>
          Review AI-generated trend surveys before they go out to your Inner Circle shoppers.
        </Typography>

        {isLoading && (
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={100} />
            ))}
          </Stack>
        )}

        {isError && !isLoading && (
          <Typography color="error">
            Failed to load survey drafts.{' '}
            <Typography component="button" variant="body2" color="primary" onClick={() => refetch()} sx={{ border: 0, bgcolor: 'transparent', cursor: 'pointer', p: 0 }}>
              Retry
            </Typography>
          </Typography>
        )}

        {!isLoading && !isError && drafts.length === 0 && <EmptyState />}

        {!isLoading && !isError && drafts.length > 0 && (
          <Grid container spacing={gridSpacing}>
            {drafts.map((draft) => (
              <Grid size={{ xs: 12, md: 6 }} key={draft.id}>
                <DraftCard draft={draft} onClick={() => setSelectedDraftId(draft.id)} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <SurveyDraftDrawer
        draftId={selectedDraftId}
        onClose={() => setSelectedDraftId(null)}
        onUpdated={() => refetch()}
      />
    </MainCard>
  );
}
