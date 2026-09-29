import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Box, Button, Divider, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { fetchActionQueue } from 'api/innerCircle.api';
import { formatDate } from 'utils/dateUtils';
import { useTasks } from 'hooks/useContacts';
import MainCard from 'ui-component/cards/MainCard';

function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(num);
}

export interface ActionQueueProps {
  companyId: string;
  /** Opens the customer drawer on the 'activity' tab for the clicked task's contact. */
  onOpenCustomer: (customerId: string) => void;
}

// ==============================|| INNER CIRCLE - ACTION QUEUE ||============================== //
// Extracted from InnerCirclePage.tsx's former "members" section (Task 3.2).

export default function ActionQueue({ companyId, onOpenCustomer }: ActionQueueProps) {
  const theme = useTheme();

  const {
    data: actionQueue,
    isLoading: actionQueueLoading,
    isError: actionQueueError,
    refetch: refetchActionQueue
  } = useQuery({
    queryKey: ['inner-circle-action-queue', companyId],
    queryFn: () => fetchActionQueue(),
    enabled: !!companyId
  });

  // Open CRM tasks for the Action Queue — the list endpoint has no status
  // filter, so over-fetch (server orders by -updated_at) and filter client-side.
  const {
    data: openTasksData,
    isLoading: openTasksLoading,
    isError: openTasksError,
    refetch: refetchOpenTasks
  } = useTasks({ page: 1, page_size: 100 });
  const openTasks = useMemo(() => (openTasksData?.results ?? []).filter((task) => task.status === 'Pending').slice(0, 8), [openTasksData]);

  return (
    <MainCard title="Action Queue">
      {actionQueueLoading && <Typography color="textSecondary">Loading...</Typography>}
      {actionQueueError && !actionQueueLoading && (
        <Stack spacing={1}>
          <Typography color="error" variant="body2">
            Failed to load action queue.
          </Typography>
          <Button size="small" onClick={() => refetchActionQueue()}>
            Retry
          </Button>
        </Stack>
      )}
      {!actionQueueLoading && !actionQueueError && actionQueue && (
        <Stack spacing={2} divider={<Divider flexItem />}>
          <Box sx={{ borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`, pl: 1.5 }}>
            <Typography variant="subtitle2" gutterBottom>
              Birthdays this week
            </Typography>
            {actionQueue.birthdays_this_week.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                None this week
              </Typography>
            ) : (
              <List dense disablePadding>
                {actionQueue.birthdays_this_week.map((item) => (
                  <ListItem key={item.id} disableGutters sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={item.name}
                      secondary={`${item.birthday}${item.days_until === 0 ? ' · Today' : ` · in ${item.days_until}d`}`}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Box sx={{ borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`, pl: 1.5 }}>
            <Typography variant="subtitle2" gutterBottom>
              Win-back candidates
            </Typography>
            {actionQueue.winback_candidates.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                None right now
              </Typography>
            ) : (
              <List dense disablePadding>
                {actionQueue.winback_candidates.map((item) => (
                  <ListItem key={item.id} disableGutters sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={item.name}
                      secondary={`${item.days_silent} days silent`}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Box sx={{ borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`, pl: 1.5 }}>
            <Typography variant="subtitle2" gutterBottom>
              Near promotion
            </Typography>
            {actionQueue.near_tier_promotions.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                None right now
              </Typography>
            ) : (
              <List dense disablePadding>
                {actionQueue.near_tier_promotions.map((item) => (
                  <ListItem key={item.id} disableGutters sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={item.name}
                      secondary={`${formatCurrency(item.spend_to_next_tier)} to next tier`}
                      primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Stack>
      )}

      <Divider sx={{ my: 2 }} />

      <Box sx={{ borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`, pl: 1.5 }}>
        <Typography variant="subtitle2" gutterBottom>
          Open tasks
        </Typography>
        {openTasksLoading && (
          <Typography variant="body2" color="textSecondary">
            Loading…
          </Typography>
        )}
        {openTasksError && !openTasksLoading && (
          <Stack spacing={1} alignItems="flex-start">
            <Typography color="error" variant="body2">
              Failed to load tasks.
            </Typography>
            <Button size="small" onClick={() => refetchOpenTasks()}>
              Retry
            </Button>
          </Stack>
        )}
        {!openTasksLoading &&
          !openTasksError &&
          (openTasks.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              None right now
            </Typography>
          ) : (
            <List dense disablePadding>
              {openTasks.map((task) => (
                <ListItem
                  key={task.id}
                  disableGutters
                  onClick={() => {
                    if (!task.contact) return;
                    onOpenCustomer(task.contact);
                  }}
                  sx={{ py: 0.5, cursor: task.contact ? 'pointer' : 'default' }}
                >
                  <ListItemText
                    primary={task.subject}
                    secondary={`${task.contact_name ?? '—'}${task.due_date ? ` · due ${formatDate(task.due_date, 'MMM dd')}` : ''}`}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          ))}
      </Box>
    </MainCard>
  );
}
