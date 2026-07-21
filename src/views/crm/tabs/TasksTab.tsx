import { useMemo, useState } from 'react';

// material-ui
import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeDarkCard from 'ui-component/cards/TotalIncomeDarkCard';
import { gridSpacing, smallWidgetHeight } from 'store/constant';

// assets
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { useIsAdmin } from 'hooks/usePermission';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from 'hooks/useContacts';
import type { Task } from 'types/crm';
import TaskForm from 'ui-component/inner-circle/TaskForm';
import { useSnackbar } from 'notistack';

// Mock data
// No mock data; use API

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pending':
      return 'warning';
    case 'Completed':
      return 'success';
    case 'Cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High':
      return 'error';
    case 'Medium':
      return 'warning';
    case 'Low':
      return 'success';
    default:
      return 'default';
  }
};

const getActivityTypeColor = (type: string) => {
  switch (type) {
    case 'Call':
      return 'primary';
    case 'Email':
      return 'info';
    case 'Meeting':
      return 'secondary';
    case 'Demo':
      return 'success';
    case 'Proposal':
      return 'warning';
    case 'Follow Up':
      return 'default';
    default:
      return 'default';
  }
};

// ==============================|| TASKS TAB ||============================== //

export default function TasksTab() {
  const isAdmin = useIsAdmin();
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { data, isLoading, isError, refetch } = useTasks({ page: page + 1, page_size: rowsPerPage });
  const rows: Task[] = useMemo(() => data?.results || [], [data]);
  const total = data?.count || 0;
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string[]> | null>(null);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const openCreate = () => {
    setEditing(null);
    setServerErrors(null);
    setFormOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setServerErrors(null);
    setFormOpen(true);
  };

  const submitForm = async (payload: any) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: payload });
        enqueueSnackbar('Task updated', { variant: 'success' });
      } else {
        await createMutation.mutateAsync(payload);
        enqueueSnackbar('Task created', { variant: 'success' });
      }
      setFormOpen(false);
      setEditing(null);
      setServerErrors(null);
    } catch (err: any) {
      const errorData = err?.response?.data;
      if (errorData && typeof errorData === 'object') setServerErrors(errorData as Record<string, string[]>);
      let message = 'Failed to save task';
      if (errorData && typeof errorData === 'object') {
        const parts: string[] = [];
        Object.entries(errorData as Record<string, any>).forEach(([field, msgs]) => {
          const text = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
          parts.push(`${field}: ${text}`);
        });
        if (parts.length) message = `Please fix these fields: ${parts.join(' | ')}`;
      }
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteMutation.mutateAsync(taskId);
      enqueueSnackbar('Task deleted', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete task', { variant: 'error' });
    }
  };

  const taskStats = {
    isLoading: false,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  // Calculate stats from current data
  const totalTasks = total;
  const pendingTasks = rows.filter((t) => t.status === 'Pending').length;
  const completedTasks = rows.filter((t) => t.status === 'Completed').length;
  const highPriorityTasks = rows.filter((t) => t.priority === 'High').length;

  return (
    <Grid container spacing={gridSpacing}>
      {/* Stats Cards */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...taskStats} value={totalTasks} title="Total Tasks" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...taskStats} value={pendingTasks} title="Pending" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...taskStats} value={completedTasks} title="Completed" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...taskStats} value={highPriorityTasks} title="High Priority" />
      </Grid>

      {/* Tasks Table */}
      <Grid size={12}>
        <MainCard
          title="Tasks"
          secondary={
            isAdmin && (
              <Button
                onClick={openCreate}
                variant="contained"
                color="primary"
                size="large"
                startIcon={<IconPlus stroke={1.5} size="20px" />}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 2.5,
                  py: 1,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  transition: 'all 0.2s ease',
                  '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.16)', transform: 'translateY(-1px)' }
                }}
              >
                Add Task
              </Button>
            )
          }
        >
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }} aria-label="tasks table">
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8}>Loading...</TableCell>
                  </TableRow>
                )}
                {isError && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography color="error">Failed to load tasks.</Typography>
                        <Button onClick={() => refetch()} size="small">
                          Retry
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !isError && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography color="textSecondary">No tasks found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle1">{task.subject}</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {task.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {(task.contact_name || 'T K')
                            .split(' ')
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">{task.contact_name || task.contact}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {task.contact_company_name || '-'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={task.activity_type} color={getActivityTypeColor(task.activity_type) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={task.status} color={getStatusColor(task.status) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={task.priority} color={getPriorityColor(task.priority) as any} size="small" />
                    </TableCell>
                    <TableCell>{task.due_date || '-'}</TableCell>
                    <TableCell>{task.assigned_to || '-'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {isAdmin && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton size="small" color="primary" onClick={() => openEdit(task)}>
                                <IconEdit stroke={1.5} size="16px" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteTask(task.id)}>
                                <IconTrash stroke={1.5} size="16px" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </MainCard>
      </Grid>

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSubmit={submitForm}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        serverErrors={serverErrors}
      />
    </Grid>
  );
}
