import { useState } from 'react';

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
import { IconPlus, IconEdit, IconTrash, IconEye } from '@tabler/icons-react';

// Mock data
const mockTasks = [
  {
    id: '1',
    subject: 'Follow up with Enterprise Solutions',
    description: 'Call David Chen to discuss proposal feedback',
    activityType: 'Call',
    dueDate: '2024-03-15',
    status: 'Pending',
    priority: 'High',
    contact: {
      firstName: 'David',
      lastName: 'Chen',
      company: 'Enterprise Solutions'
    },
    assignedTo: 'Admin User',
    createdAt: '2024-02-10'
  },
  {
    id: '2',
    subject: 'Prepare proposal for Garcia Consulting',
    description: 'Create detailed proposal for strategic consulting services',
    activityType: 'Proposal',
    dueDate: '2024-03-20',
    status: 'Pending',
    priority: 'Medium',
    contact: {
      firstName: 'Maria',
      lastName: 'Garcia',
      company: 'Garcia Consulting'
    },
    assignedTo: 'Sarah Johnson',
    createdAt: '2024-02-15'
  },
  {
    id: '3',
    subject: 'Demo for TechStartup',
    description: 'Schedule and prepare product demonstration',
    activityType: 'Demo',
    dueDate: '2024-02-25',
    status: 'Completed',
    priority: 'High',
    contact: {
      firstName: 'Alex',
      lastName: 'Turner',
      company: 'TechStartup Inc.'
    },
    assignedTo: 'Mike Wilson',
    createdAt: '2024-02-20'
  },
  {
    id: '4',
    subject: 'Contract review with Retail Chain',
    description: 'Review and finalize contract terms',
    activityType: 'Follow Up',
    dueDate: '2024-03-25',
    status: 'Pending',
    priority: 'Medium',
    contact: {
      firstName: 'Charlie',
      lastName: 'Davis',
      company: 'Retail Solutions'
    },
    assignedTo: 'Sarah Johnson',
    createdAt: '2024-02-05'
  },
  {
    id: '5',
    subject: 'Discovery call with Wilson Manufacturing',
    description: 'Initial discovery call to understand requirements',
    activityType: 'Call',
    dueDate: '2024-03-30',
    status: 'Pending',
    priority: 'Low',
    contact: {
      firstName: 'Bob',
      lastName: 'Johnson',
      company: 'StartupXYZ'
    },
    assignedTo: 'Mike Wilson',
    createdAt: '2024-01-25'
  }
];

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
  const [tasks, setTasks] = useState(mockTasks);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId));
  };

  const taskStats = {
    isLoading: false,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  // Calculate stats from current data
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((t) => t.status === 'Pending').length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const highPriorityTasks = tasks.filter((t) => t.priority === 'High').length;

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
            <Button variant="contained" startIcon={<IconPlus stroke={1.5} size="20px" />} sx={{ textTransform: 'none' }}>
              Add Task
            </Button>
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
                {tasks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle1">{task.subject}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {task.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {task.contact.firstName[0]}
                          {task.contact.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {task.contact.firstName} {task.contact.lastName}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {task.contact.company}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={task.activityType} color={getActivityTypeColor(task.activityType) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={task.status} color={getStatusColor(task.status) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={task.priority} color={getPriorityColor(task.priority) as any} size="small" />
                    </TableCell>
                    <TableCell>{task.dueDate}</TableCell>
                    <TableCell>{task.assignedTo}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title="View">
                          <IconButton size="small" color="primary">
                            <IconEye stroke={1.5} size="16px" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" color="primary">
                            <IconEdit stroke={1.5} size="16px" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDeleteTask(task.id)}>
                            <IconTrash stroke={1.5} size="16px" />
                          </IconButton>
                        </Tooltip>
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
            count={tasks.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </MainCard>
      </Grid>
    </Grid>
  );
}
