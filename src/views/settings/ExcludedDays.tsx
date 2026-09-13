import * as React from 'react';
import { useSnackbar } from 'notistack';

import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

import MainCard from 'ui-component/cards/MainCard';
import { deleteCalendarException, getCalendarExceptions } from 'api/scheduling.api';
import { EXCLUSIONS_BLURB, SOURCE_LABELS, formatDay, groupExclusions, rangeSummary } from 'ui-component/scheduling/learningExclusions';
import { KIND_LABELS } from 'ui-component/scheduling/calendarExceptions';
import type { ExclusionGroup } from 'ui-component/scheduling/learningExclusions';

/**
 * The read-only ledger of what Allyvia has been told to ignore, with an undo.
 *
 * Read-only on purpose: declaring happens where the owner is already thinking
 * about the calendar (Scheduling › Calendar) or in answer to the agent's own
 * question on the dashboard. What Settings is for is the question "what have I
 * told it to ignore?" — which nowhere else answers, and which matters because
 * a forgotten exclusion is invisible by construction.
 */
const ExcludedDays: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [groups, setGroups] = React.useState<ExclusionGroup[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const response = await getCalendarExceptions();
      setGroups(groupExclusions(response.items ?? []));
    } catch {
      // An error must not render as "nothing is excluded". That reads as a
      // fact about the shop, and it is the opposite of the truth the owner
      // came here for.
      setGroups(null);
      setError("Couldn't load your flagged days.");
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const remove = async (group: ExclusionGroup) => {
    setRemoving(group.key);
    try {
      // A range is N rows; the owner declared one thing and removes one thing.
      // Sequential rather than parallel so a partial failure leaves a
      // comprehensible state rather than an arbitrary subset.
      for (const id of group.ids) {
        await deleteCalendarException(id);
      }
      enqueueSnackbar(
        group.days === 1
          ? `${formatDay(group.start)} counts as a normal day again.`
          : `Those ${group.days} days count as normal days again.`,
        { variant: 'success' }
      );
      await load();
    } catch {
      enqueueSnackbar('Could not remove that. Some days may still be flagged.', { variant: 'error' });
      await load();
    } finally {
      setRemoving(null);
    }
  };

  return (
    <MainCard title="Excluded days" content={false}>
      <Box sx={{ p: 2.5 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {EXCLUSIONS_BLURB}
        </Typography>

        {error && (
          <Alert
            severity="error"
            action={
              <Button size="small" onClick={load}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {!error && groups === null && (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={16} />
            <Typography variant="body2" color="textSecondary">
              Loading…
            </Typography>
          </Stack>
        )}

        {groups !== null && groups.length === 0 && (
          <Typography variant="body2" color="textSecondary">
            Nothing is flagged. Allyvia is learning from every day.
          </Typography>
        )}

        {groups !== null && groups.length > 0 && (
          <Stack spacing={1.25}>
            {groups.map((group) => (
              <Stack
                key={group.key}
                direction="row"
                spacing={2}
                alignItems="flex-start"
                sx={{ py: 1.25, borderBottom: 1, borderColor: 'divider' }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {rangeSummary(group.start, group.end)}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip size="small" label={KIND_LABELS[group.kind]} variant="outlined" />
                    <Typography variant="caption" color="textSecondary">
                      {SOURCE_LABELS[group.source]}
                      {group.created_by_email ? ` · ${group.created_by_email}` : ''}
                    </Typography>
                  </Stack>
                  {group.note && (
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                      {group.note}
                    </Typography>
                  )}
                </Box>
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<DeleteOutlineOutlinedIcon fontSize="small" />}
                  disabled={removing === group.key}
                  onClick={() => remove(group)}
                >
                  {removing === group.key ? 'Removing…' : 'Remove'}
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </MainCard>
  );
};

export default ExcludedDays;
