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
const mockLeads = [
  {
    id: '1',
    contact: {
      firstName: 'Jane',
      lastName: 'Smith',
      company: 'Enterprise Corp',
      jobTitle: 'CTO'
    },
    status: 'New',
    priority: 'High',
    score: 85,
    estimatedValue: 50000,
    leadSourceDetails: 'Website',
    qualificationNotes: 'Strong interest in our enterprise solution',
    expectedCloseDate: '2024-03-15',
    assignedTo: 'Sarah Johnson',
    createdAt: '2024-01-20'
  },
  {
    id: '2',
    contact: {
      firstName: 'Charlie',
      lastName: 'Davis',
      company: 'Retail Solutions',
      jobTitle: 'VP Sales'
    },
    status: 'Qualified',
    priority: 'Medium',
    score: 72,
    estimatedValue: 75000,
    leadSourceDetails: 'Referral',
    qualificationNotes: 'Referred by existing customer',
    expectedCloseDate: '2024-03-30',
    assignedTo: 'Sarah Johnson',
    createdAt: '2024-02-05'
  },
  {
    id: '3',
    contact: {
      firstName: 'Maria',
      lastName: 'Garcia',
      company: 'Garcia Consulting',
      jobTitle: 'Managing Director'
    },
    status: 'Proposal',
    priority: 'High',
    score: 90,
    estimatedValue: 120000,
    leadSourceDetails: 'Cold Call',
    qualificationNotes: 'Ready for proposal presentation',
    expectedCloseDate: '2024-03-10',
    assignedTo: 'Mike Wilson',
    createdAt: '2024-02-15'
  },
  {
    id: '4',
    contact: {
      firstName: 'Bob',
      lastName: 'Johnson',
      company: 'StartupXYZ',
      jobTitle: 'Founder'
    },
    status: 'Negotiation',
    priority: 'Medium',
    score: 68,
    estimatedValue: 35000,
    leadSourceDetails: 'Trade Show',
    qualificationNotes: 'In final negotiation phase',
    expectedCloseDate: '2024-03-05',
    assignedTo: 'Mike Wilson',
    createdAt: '2024-01-25'
  },
  {
    id: '5',
    contact: {
      firstName: 'Alex',
      lastName: 'Turner',
      company: 'TechStartup Inc.',
      jobTitle: 'Founder'
    },
    status: 'New',
    priority: 'Low',
    score: 45,
    estimatedValue: 25000,
    leadSourceDetails: 'Website',
    qualificationNotes: 'Early stage, needs nurturing',
    expectedCloseDate: '2024-04-15',
    assignedTo: 'Sarah Johnson',
    createdAt: '2024-02-20'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'New':
      return 'info';
    case 'Qualified':
      return 'warning';
    case 'Proposal':
      return 'primary';
    case 'Negotiation':
      return 'secondary';
    case 'Closed Won':
      return 'success';
    case 'Closed Lost':
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

// ==============================|| LEADS TAB ||============================== //

export default function LeadsTab() {
  const [leads, setLeads] = useState(mockLeads);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteLead = (leadId: string) => {
    setLeads(leads.filter(lead => lead.id !== leadId));
  };

  const leadStats = {
    isLoading: false,
    showIcon: false,
    height: smallWidgetHeight,
    isTaggable: false
  };

  // Calculate stats from current data
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'New').length;
  const qualifiedLeads = leads.filter(l => l.status === 'Qualified').length;
  const totalValue = leads.reduce((sum, lead) => sum + lead.estimatedValue, 0);

  return (
    <Grid container spacing={gridSpacing}>
      {/* Stats Cards */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...leadStats} value={totalLeads} title="Total Leads" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...leadStats} value={newLeads} title="New Leads" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...leadStats} value={qualifiedLeads} title="Qualified" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <TotalIncomeDarkCard {...leadStats} value={`$${(totalValue / 1000).toFixed(0)}k`} title="Total Value" />
      </Grid>

      {/* Leads Table */}
      <Grid size={12}>
        <MainCard
          title="Leads"
          secondary={
            <Button
              variant="contained"
              startIcon={<IconPlus stroke={1.5} size="20px" />}
              sx={{ textTransform: 'none' }}
            >
              Add Lead
            </Button>
          }
        >
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }} aria-label="leads table">
              <TableHead>
                <TableRow>
                  <TableCell>Contact</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Expected Close</TableCell>
                  <TableCell>Assigned To</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((lead) => (
                  <TableRow key={lead.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {lead.contact.firstName[0]}{lead.contact.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1">
                            {lead.contact.firstName} {lead.contact.lastName}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {lead.contact.jobTitle}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{lead.contact.company}</TableCell>
                    <TableCell>
                      <Chip
                        label={lead.status}
                        color={getStatusColor(lead.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={lead.priority}
                        color={getPriorityColor(lead.priority) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{lead.score}</TableCell>
                    <TableCell>${lead.estimatedValue.toLocaleString()}</TableCell>
                    <TableCell>{lead.expectedCloseDate}</TableCell>
                    <TableCell>{lead.assignedTo}</TableCell>
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
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteLead(lead.id)}
                          >
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
            count={leads.length}
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